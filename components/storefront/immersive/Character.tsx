"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  Box3,
  BufferGeometry,
  CanvasTexture,
  Group,
  Mesh,
  SkinnedMesh,
  MeshStandardMaterial,
  Vector3,
  type AnimationAction,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Body } from "@/lib/immersive/world";
import {
  gait,
  advancePhase,
  pickupWeight,
  PICKUP_SECONDS,
} from "@/lib/immersive/motion";
import { DEFAULT_AVATAR, type Avatar } from "@/lib/immersive/avatar";
import { dressGeometry } from "@/lib/immersive/wardrobe";
const STAFF_AVATAR: Avatar = {
  ...DEFAULT_AVATAR,
  top: "cream",
  trousers: "dark",
};
export const CHARACTER_URL = "/storefront/immersive/shopper.glb";
export function Character({
  body,
  pickup,
  staff = false,
  paused = false,
  appearance = DEFAULT_AVATAR,
}: {
  body: MutableRefObject<Body>;
  pickup: MutableRefObject<number>;
  staff?: boolean;
  paused?: boolean;
  appearance?: Avatar;
}) {
  const gltf = useGLTF(CHARACTER_URL),
    group = useRef<Group>(null),
    lastPickup = useRef(0),
    phase = useRef(0),
    pickupTime = useRef(PICKUP_SECONDS),
    weights = useRef({ idle: 1, walk: 0, run: 0 });
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
    const owned: BufferGeometry[] = [],
      materials: MeshStandardMaterial[] = [];
    const garments: { source: SkinnedMesh; mesh: SkinnedMesh }[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.frustumCulled = false;
      if (object.geometry.getAttribute("color")) {
        const dressed = dressGeometry(
          object.geometry,
          staff ? STAFF_AVATAR : appearance,
        );
        object.geometry = dressed.geometry;
        owned.push(dressed.geometry);
        if (dressed.garment && object instanceof SkinnedMesh) {
          owned.push(dressed.garment);
          const material = new MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.94,
          });
          materials.push(material);
          const garment = new SkinnedMesh(dressed.garment, material);
          garment.position.copy(object.position);
          garment.quaternion.copy(object.quaternion);
          garment.scale.copy(object.scale);
          garment.bindMode = object.bindMode;
          garment.bind(object.skeleton, object.bindMatrix);
          garment.castShadow = true;
          garment.frustumCulled = false;
          garments.push({ source: object, mesh: garment });
        }
      }
    });
    for (const { source, mesh } of garments) source.parent?.add(mesh);
    const box = new Box3().setFromObject(scene),
      height = box.getSize(new Vector3()).y,
      scale = 1.75 / height;
    scene.scale.setScalar(scale);
    scene.position.y = -box.min.y * scale;
    const mixer = new AnimationMixer(scene),
      actions: Record<string, AnimationAction> = {};
    for (const clip of gltf.animations)
      actions[clip.name] = mixer.clipAction(clip);
    const skeletons = new Set<SkinnedMesh["skeleton"]>();
    scene.traverse((object) => {
      if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    });
    return { scene, mixer, actions, owned, materials, skeletons };
  }, [gltf, staff, appearance]);
  useEffect(
    () => () => {
      rig.owned.forEach((geometry) => geometry.dispose());
      rig.materials.forEach((material) => material.dispose());
      rig.skeletons.forEach((skeleton) => skeleton.dispose());
    },
    [rig],
  );
  useEffect(() => {
    for (const action of Object.values(rig.actions))
      action.reset().play().setEffectiveWeight(0);
    rig.actions[staff ? "Idle_Talking_Loop" : "Idle_Loop"]?.setEffectiveWeight(
      1,
    );
    rig.actions.Walk_Loop?.setEffectiveTimeScale(0);
    rig.actions.Jog_Fwd_Loop?.setEffectiveTimeScale(0);
    rig.actions.PickUp_Table?.setEffectiveTimeScale(0);
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
    if (paused || document.hidden) return;
    const dt = Math.min(delta, 0.1);
    if (pickup.current !== lastPickup.current) {
      lastPickup.current = pickup.current;
      pickupTime.current = 0;
    }
    pickupTime.current = Math.min(PICKUP_SECONDS, pickupTime.current + dt);
    const overlay = pickupWeight(pickupTime.current);
    const target = gait(b.speed),
      blend = 1 - Math.exp(-16 * dt);
    for (const key of ["idle", "walk", "run"] as const)
      weights.current[key] += (target[key] - weights.current[key]) * blend;
    phase.current = advancePhase(phase.current, b.speed, dt);
    const actions = rig.actions;
    actions[staff ? "Idle_Talking_Loop" : "Idle_Loop"]?.setEffectiveWeight(
      weights.current.idle * (1 - overlay),
    );
    for (const [key, name] of [
      ["walk", "Walk_Loop"],
      ["run", "Jog_Fwd_Loop"],
    ] as const) {
      const action = actions[name];
      if (!action) continue;
      action.time = phase.current * action.getClip().duration;
      action.setEffectiveWeight(weights.current[key] * (1 - overlay));
    }
    if (actions.PickUp_Table) {
      actions.PickUp_Table.time = Math.min(
        pickupTime.current,
        PICKUP_SECONDS - 0.001,
      );
      actions.PickUp_Table.setEffectiveWeight(overlay);
    }
    rig.mixer.update(dt);
  }, -1);
  return (
    <group ref={group}>
      <primitive object={rig.scene} dispose={null} />
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.7]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
