"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  Box3,
  CanvasTexture,
  Group,
  LoopOnce,
  Mesh,
  Vector3,
  type AnimationAction,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Body } from "@/lib/immersive/world";
export const CHARACTER_URL = "/storefront/immersive/shopper.glb";
export function Character({
  body,
  pickup,
  staff = false,
}: {
  body: MutableRefObject<Body>;
  pickup: MutableRefObject<number>;
  staff?: boolean;
}) {
  const gltf = useGLTF(CHARACTER_URL),
    group = useRef<Group>(null),
    lastPickup = useRef(0);
  const shadow = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const c = canvas.getContext("2d")!;
    const gradient = c.createRadialGradient(32, 32, 3, 32, 32, 31);
    gradient.addColorStop(0, "rgba(30,30,22,.28)");
    gradient.addColorStop(1, "rgba(30,30,22,0)");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 64, 64);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => shadow.dispose(), [shadow]);
  const rig = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.frustumCulled = false;
      }
    });
    const box = new Box3().setFromObject(scene),
      height = box.getSize(new Vector3()).y,
      scale = 1.75 / height;
    scene.scale.setScalar(scale);
    scene.position.y = -box.min.y * scale;
    const mixer = new AnimationMixer(scene),
      actions: Record<string, AnimationAction> = {};
    for (const clip of gltf.animations)
      actions[clip.name] = mixer.clipAction(clip);
    return { scene, mixer, actions };
  }, [gltf]);
  useEffect(() => {
    for (const name of ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop"])
      rig.actions[name]
        ?.reset()
        .play()
        .setEffectiveWeight(name === "Idle_Loop" && !staff ? 1 : 0);
    if (staff) rig.actions.Idle_Talking_Loop?.reset().play();
    rig.mixer.update(0);
    return () => {
      rig.mixer.stopAllAction();
    };
  }, [rig, staff]);
  useFrame((_, delta) => {
    const b = body.current;
    if (group.current) {
      group.current.position.set(b.x, 0, b.z);
      group.current.rotation.y = b.yaw;
    }
    const actions = rig.actions,
      picking = actions.PickUp_Table;
    if (pickup.current !== lastPickup.current) {
      lastPickup.current = pickup.current;
      if (picking) {
        picking.reset().setLoop(LoopOnce, 1);
        picking.clampWhenFinished = false;
        picking.setEffectiveWeight(1).fadeIn(0.12).play();
      }
    }
    const busy = picking?.isRunning() || false;
    if (!staff) {
      const walk = Math.min(1, b.speed / 1.6),
        run = Math.max(0, Math.min(1, (b.speed - 2) / 1.2));
      const blend = 1 - Math.exp(-10 * Math.min(delta, 0.05));
      for (const [name, target] of [
        ["Idle_Loop", 1 - walk],
        ["Walk_Loop", walk * (1 - run)],
        ["Jog_Fwd_Loop", run],
      ] as const) {
        const action = actions[name];
        if (action)
          action.setEffectiveWeight(
            action.getEffectiveWeight() +
              ((busy ? 0.05 : target) - action.getEffectiveWeight()) * blend,
          );
      }
    }
    rig.mixer.update(Math.min(delta, 0.05));
  });
  return (
    <group ref={group}>
      <primitive object={rig.scene} dispose={null} />
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      {staff ? (
        <mesh position={[0, 1.03, 0.16]}>
          <boxGeometry args={[0.36, 0.48, 0.06]} />
          <meshStandardMaterial color="#245644" roughness={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}
