"use client";
import {
  Suspense,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import { ACESFilmicToneMapping, PerspectiveCamera, Vector3 } from "three";
import { Character, CHARACTER_URL } from "./Character";
import { RoomLighting } from "./RoomLighting";
import { Environment } from "./Environment";
import { FrameProfiler } from "./FrameProfiler";
import { cameraObstacles, constrainCamera } from "@/lib/immersive/camera";
import { PICKUP_SECONDS } from "@/lib/immersive/motion";
import {
  createNpc,
  stepNpc,
  bodyCollider,
  CUSTOMER_ROUTE,
  STAFF_ROUTE,
} from "@/lib/immersive/npc";
import {
  nearestInteraction,
  stepBody,
  canOccupy,
  turnTowards,
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
  frameMs: number;
  p50Ms: number;
  p95Ms: number;
  samples: number;
  gpuMs: number | null;
  estimatedMB: number;
  geometries: number;
  textures: number;
  renderWidth: number;
  renderHeight: number;
  assetBytes: number;
  assetMs: number;
  firstRenderMs: number;
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
  resolution: number;
  startedAt?: number;
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
  const staffState = useRef(createNpc(STAFF_ROUTE)),
    customerState = useRef(createNpc(CUSTOMER_ROUTE));
  const staff = useRef(staffState.current.body),
    customer = useRef(customerState.current.body);
  const displayPlayer = useRef({ ...player.current }),
    previous = useRef({ ...player.current });
  const pickup = useRef(0),
    staffAction = useRef(0),
    customerAction = useRef(0),
    lastInteract = useRef(0),
    lastReset = useRef(0),
    pickupRemaining = useRef(0),
    accumulator = useRef(0),
    resume = useRef(true),
    lastNearby = useRef<string | null>(null),
    orbit = useRef({ yaw: 0, pitch: 0.28 }),
    cameraStarted = useRef(false);
  useEffect(() => {
    accumulator.current = 0;
    resume.current = true;
  }, [props.paused]);
  const target = useMemo(() => new Vector3(), []),
    focus = useMemo(() => new Vector3(), []),
    desired = useMemo(() => new Vector3(), []),
    safe = useMemo(() => new Vector3(), []);
  const cameraBoxes = useMemo(() => cameraObstacles(config.fixtures), [config]);
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = size.width / size.height < 0.8 ? 68 : 58;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onReady, onError]);
  useFrame((_, delta) => {
    if (document.hidden || props.paused) return;
    const dt = resume.current ? 0 : Math.min(delta, 0.1),
      control = input.current;
    resume.current = false;
    if (lastReset.current !== control.reset) {
      lastReset.current = control.reset;
      player.current = {
        ...config.spawn,
        vx: 0,
        vz: 0,
        yaw: Math.PI,
        speed: 0,
      };
      previous.current = { ...player.current };
      control.yaw = 0;
      accumulator.current = 0;
      cameraStarted.current = false;
    }
    if (pickup.current !== control.pickup) {
      pickup.current = control.pickup;
      pickupRemaining.current = PICKUP_SECONDS;
    }
    accumulator.current += dt;
    const fixed = 1 / 60;
    while (accumulator.current >= fixed) {
      previous.current = player.current;
      pickupRemaining.current = Math.max(0, pickupRemaining.current - fixed);
      player.current = stepBody(
        player.current,
        control.enabled && pickupRemaining.current === 0
          ? { x: control.x, z: control.z }
          : { x: 0, z: 0 },
        control.run,
        control.yaw,
        fixed,
        [
          ...config.fixtures,
          bodyCollider(staff.current),
          ...(!props.low ? [bodyCollider(customer.current)] : []),
        ],
      );
      const visits = staffState.current.visits;
      staffState.current = stepNpc(staffState.current, STAFF_ROUTE, fixed, [
        ...config.fixtures,
        bodyCollider(player.current),
      ]);
      staff.current = staffState.current.body;
      if (
        staffState.current.visits !== visits &&
        staffState.current.activity === "prepare"
      )
        staffAction.current++;
      if (!props.low) {
        const visits = customerState.current.visits;
        customerState.current = stepNpc(
          customerState.current,
          CUSTOMER_ROUTE,
          fixed,
          [
            ...config.fixtures,
            bodyCollider(player.current),
            bodyCollider(staff.current),
          ],
        );
        customer.current = customerState.current.body;
        if (
          customerState.current.visits !== visits &&
          customerState.current.activity === "browse"
        )
          customerAction.current++;
        if (
          customerState.current.visits !== visits &&
          customerState.current.activity === "queue"
        )
          staffAction.current++;
      }
      accumulator.current -= fixed;
    }
    const alpha = accumulator.current / fixed,
      current = player.current,
      before = previous.current;
    displayPlayer.current = {
      ...current,
      x: before.x + (current.x - before.x) * alpha,
      z: before.z + (current.z - before.z) * alpha,
      yaw: turnTowards(before.yaw, current.yaw, alpha),
    };
    const p = displayPlayer.current;
    audio.current?.step(p.speed);
    orbit.current.yaw = turnTowards(
      orbit.current.yaw,
      control.yaw,
      1 - Math.exp(-16 * dt),
    );
    orbit.current.pitch +=
      (control.pitch - orbit.current.pitch) * (1 - Math.exp(-16 * dt));
    focus.set(p.x, 1.32, p.z);
    if (!cameraStarted.current) target.copy(focus);
    else target.lerp(focus, 1 - Math.exp(-18 * dt));
    if (!canOccupy({ x: target.x, z: target.z }, config.fixtures, 0.18))
      target.copy(focus);
    desired.set(
      p.x + Math.sin(orbit.current.yaw) * 3.5,
      1.27 + orbit.current.pitch * 3.5,
      p.z + Math.cos(orbit.current.yaw) * 3.5,
    );
    constrainCamera(target, desired, cameraBoxes, safe);
    desired.copy(safe);
    if (!cameraStarted.current) {
      camera.position.copy(desired);
      cameraStarted.current = true;
    } else camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
    // Re-check after smoothing so camera easing cannot tunnel into a fixture.
    constrainCamera(target, camera.position, cameraBoxes, safe);
    camera.position.copy(safe);
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
  }, -2);
  return (
    <>
      <FrameProfiler
        body={player}
        paused={props.paused}
        onStats={props.onStats}
        onReady={onReady}
        onError={onError}
        startedAt={props.startedAt}
      />
      {!props.low ? <RoomLighting /> : null}
      <color attach="background" args={["#efe3cf"]} />
      <fog attach="fog" args={["#efe3cf", 16, 30]} />
      <hemisphereLight args={["#ffedd1", "#8d7659", 1.25 * config.light]} />
      <directionalLight
        position={[-3.5, 7, 4]}
        intensity={2.25 * config.light}
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
        low={props.low}
        config={config}
        placements={placements}
        currency={props.currency}
        nearby={props.nearby}
      />
      <Character body={displayPlayer} pickup={pickup} paused={props.paused} />
      <Character
        body={staff}
        pickup={staffAction}
        staff
        paused={props.paused}
      />
      {!props.low ? (
        <Character
          body={customer}
          pickup={customerAction}
          paused={props.paused}
        />
      ) : null}
    </>
  );
}
export function clearSceneAssetCache() {
  useGLTF.clear(CHARACTER_URL);
}
function Scene(props: SceneProps) {
  const [hidden, setHidden] = useState(false);
  const startedAt = useRef(performance.now());
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
        dpr={props.resolution}
        camera={{ position: [1.9, 2.5, 6.5], fov: 58, near: 0.1, far: 40 }}
        gl={{
          antialias: !props.low,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Suspense fallback={null}>
          <World
            {...props}
            paused={props.paused || hidden}
            startedAt={startedAt.current}
          />
        </Suspense>
      </Canvas>
    </>
  );
}

export default memo(Scene);
