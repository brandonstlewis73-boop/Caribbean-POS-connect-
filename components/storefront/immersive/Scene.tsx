"use client";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Box3,
  PerspectiveCamera,
  Ray,
  Vector3,
} from "three";
import { Character, CHARACTER_URL } from "./Character";
import { Environment } from "./Environment";
import {
  nearestInteraction,
  stepBody,
  type Body,
  type Placement,
  type WorldConfig,
} from "@/lib/immersive/world";
import type { Controls } from "./useControls";
import type { StoreAudio } from "./audio";
export type Quality = "auto" | "low" | "high";
export type SceneStats = {
  fps: number;
  calls: number;
  triangles: number;
  x: number;
  z: number;
  speed: number;
};
export type SceneProps = {
  config: WorldConfig;
  placements: Placement[];
  currency: string;
  input: MutableRefObject<Controls>;
  audio: MutableRefObject<StoreAudio | null>;
  nearby: string | null;
  low: boolean;
  paused: boolean;
  onReady: () => void;
  onProgress: (value: number) => void;
  onError: () => void;
  onNearby: (id: string | null) => void;
  onInteract: (id: string | null) => void;
  onStats: (stats: SceneStats) => void;
};
function Progress({ onProgress }: { onProgress: (value: number) => void }) {
  const progress = useProgress((state) => state.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}
function World(props: SceneProps) {
  const { config, input, placements, audio, onReady, onError } = props,
    { camera, gl, size } = useThree();
  const player = useRef<Body>({
    ...config.spawn,
    vx: 0,
    vz: 0,
    yaw: Math.PI,
    speed: 0,
  });
  const staff = useRef<Body>({
    x: -2.5,
    z: -6.45,
    vx: 0,
    vz: 0,
    yaw: 0,
    speed: 0,
  });
  const customer = useRef<Body>({
    x: 3.25,
    z: 1,
    vx: 0,
    vz: 0,
    yaw: Math.PI,
    speed: 0,
  });
  const pickup = useRef(0),
    staffAction = useRef(0),
    noAction = useRef(0),
    lastInteract = useRef(0),
    lastReset = useRef(0),
    elapsed = useRef(0),
    stats = useRef({ time: 0, frames: 0 }),
    lastNearby = useRef<string | null>(null);
  const target = useMemo(() => new Vector3(), []),
    desired = useMemo(() => new Vector3(), []),
    direction = useMemo(() => new Vector3(), []),
    hit = useMemo(() => new Vector3(), []),
    ray = useMemo(() => new Ray(), []);
  const cameraBoxes = useMemo(
    () =>
      config.fixtures.map(
        (c) =>
          new Box3(
            new Vector3(c.x - c.width / 2, 0, c.z - c.depth / 2),
            new Vector3(c.x + c.width / 2, c.height, c.z + c.depth / 2),
          ),
      ),
    [config],
  );
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = size.width / size.height < 0.8 ? 68 : 58;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);
  useEffect(() => {
    onReady();
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onReady, onError]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    const dt = Math.min(delta, 0.05),
      control = input.current;
    elapsed.current += dt;
    if (lastReset.current !== control.reset) {
      lastReset.current = control.reset;
      player.current = {
        ...config.spawn,
        vx: 0,
        vz: 0,
        yaw: Math.PI,
        speed: 0,
      };
      control.yaw = 0;
    }
    const npcZ = 1 + Math.sin(elapsed.current * 0.17) * 2.2,
      dz = npcZ - customer.current.z;
    customer.current = {
      ...customer.current,
      z: npcZ,
      speed: Math.abs(dz) / Math.max(dt, 0.001),
      yaw: dz >= 0 ? 0 : Math.PI,
    };
    const npcCollider = {
      x: customer.current.x,
      z: customer.current.z,
      width: 0.45,
      depth: 0.45,
      height: 1.8,
    };
    player.current = stepBody(
      player.current,
      control.enabled ? { x: control.x, z: control.z } : { x: 0, z: 0 },
      control.run,
      control.yaw,
      dt,
      [
        ...config.fixtures,
        {
          x: staff.current.x,
          z: staff.current.z,
          width: 0.5,
          depth: 0.5,
          height: 1.8,
        },
        ...(!props.low ? [npcCollider] : []),
      ],
    );
    pickup.current = control.pickup;
    if (Math.floor(elapsed.current / 13) > staffAction.current)
      staffAction.current = Math.floor(elapsed.current / 13);
    const p = player.current;
    audio.current?.step(p.speed);
    target.set(p.x, 1.25, p.z);
    desired.set(
      p.x + Math.sin(control.yaw) * 3.5,
      1.25 + control.pitch * 3.5,
      p.z + Math.cos(control.yaw) * 3.5,
    );
    desired.x = Math.max(-5.65, Math.min(5.65, desired.x));
    desired.z = Math.max(-6.65, Math.min(6.65, desired.z));
    direction.copy(desired).sub(target);
    let distance = direction.length();
    ray.set(target, direction.normalize());
    for (const box of cameraBoxes) {
      if (ray.intersectBox(box, hit))
        distance = Math.min(
          distance,
          Math.max(0.65, hit.distanceTo(target) - 0.18),
        );
    }
    desired.copy(target).addScaledVector(direction, distance);
    camera.position.lerp(desired, 1 - Math.exp(-9 * dt));
    camera.lookAt(target);
    const closest = nearestInteraction(p, placements, config.checkout);
    if (closest !== lastNearby.current) {
      lastNearby.current = closest;
      props.onNearby(closest);
    }
    if (control.interact !== lastInteract.current) {
      lastInteract.current = control.interact;
      if (control.enabled) props.onInteract(closest);
    }
    stats.current.time += delta;
    stats.current.frames++;
    if (stats.current.time >= 1) {
      props.onStats({
        fps: Math.round(stats.current.frames / stats.current.time),
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        x: p.x,
        z: p.z,
        speed: p.speed,
      });
      stats.current = { time: 0, frames: 0 };
    }
  });
  return (
    <>
      <color attach="background" args={["#efe3cf"]} />
      <fog attach="fog" args={["#efe3cf", 16, 30]} />
      <hemisphereLight args={["#ffedd1", "#8d7659", 1.9 * config.light]} />
      <directionalLight
        position={[-3.5, 7, 4]}
        intensity={3.1 * config.light}
        color="#ffe5b6"
        castShadow={!props.low}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.001}
      />
      <pointLight
        position={[0, 3, -4]}
        intensity={12 * config.light}
        color="#ffcf83"
        distance={12}
        decay={2}
      />
      <Environment
        config={config}
        placements={placements}
        currency={props.currency}
        nearby={props.nearby}
      />
      <Character body={player} pickup={pickup} />
      <Character body={staff} pickup={staffAction} staff />
      {!props.low ? <Character body={customer} pickup={noAction} /> : null}
    </>
  );
}
export function clearSceneAssetCache() {
  useGLTF.clear(CHARACTER_URL);
}
export default function Scene(props: SceneProps) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <>
      <Progress onProgress={props.onProgress} />
      <Canvas
        frameloop={props.paused || hidden ? "demand" : "always"}
        shadows={!props.low}
        dpr={props.low ? 1 : [1, 1.5]}
        camera={{ position: [1.9, 2.5, 6.5], fov: 58, near: 0.1, far: 40 }}
        gl={{
          antialias: !props.low,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <World {...props} />
        </Suspense>
      </Canvas>
    </>
  );
}
