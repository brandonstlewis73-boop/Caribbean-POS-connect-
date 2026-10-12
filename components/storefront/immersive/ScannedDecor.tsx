"use client";
import { useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Mesh,
  InstancedMesh,
  Object3D,
  type BufferGeometry,
  type Material,
} from "three";
import type { WorldConfig } from "@/lib/immersive/world";
import { bakeGeometry } from "@/lib/immersive/model-geometry";
import { surfaceMaterial } from "@/lib/immersive/wardrobe";
export const DECOR_MODELS = [
  "croissant",
  "carrot_cake",
  "potted_plant_01",
] as const;
export type DecorModel = (typeof DECOR_MODELS)[number];
export const decorUrl = (name: DecorModel) =>
  `/storefront/immersive/decor/${name}.glb`;
type Placement = {
  position: [number, number, number];
  scale: number;
  rotation?: number;
};
function Part({
  geometry,
  material,
  placements,
}: {
  geometry: BufferGeometry;
  material: Material | Material[];
  placements: Placement[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    placements.forEach((p, i) => {
      o.position.set(...p.position);
      o.scale.setScalar(p.scale);
      o.rotation.set(0, p.rotation || 0, 0);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [placements]);
  useEffect(() => {
    const mesh = ref.current;
    return () => mesh?.dispose();
  }, [geometry, material, placements.length]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, placements.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
function Instances({
  low,
  name,
  placements,
}: {
  name: DecorModel;
  low: boolean;
  placements: Placement[];
}) {
  const { scene } = useGLTF(decorUrl(name));
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: {
      geometry: BufferGeometry;
      material: Material | Material[];
    }[] = [];
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        const geometry = bakeGeometry(o.geometry, o.matrixWorld);
        list.push({
          geometry,
          material: Array.isArray(o.material)
            ? o.material.map((m) => surfaceMaterial(m, low))
            : surfaceMaterial(o.material, low),
        });
      }
    });
    return list;
  }, [scene, low]);
  useEffect(
    () => () =>
      parts.forEach((p) => {
        p.geometry.dispose();
        (Array.isArray(p.material) ? p.material : [p.material]).forEach((m) =>
          m.dispose(),
        );
      }),
    [parts],
  );
  return (
    <group>
      {parts.map((p, i) => (
        <Part key={i} {...p} placements={placements} />
      ))}
    </group>
  );
}
export function ScannedDecor({
  config,
  low,
}: {
  config: WorldConfig;
  low: boolean;
}) {
  const bread = useMemo<Placement[]>(
    () =>
      [0.58, 1.24, 1.9].flatMap((y) =>
        Array.from({ length: low ? 5 : 9 }, (_, i) => ({
          position: [0.55 + i * (low ? 1.04 : 0.52), y, -6.48],
          scale: 1.8,
          rotation: ((i % 3) - 1) * 0.18,
        })),
      ),
    [low],
  );
  const plants = useMemo<Placement[]>(
    () =>
      [-1, 1].flatMap((side) => [
        { position: [side * 4.8, 0, 5.5], scale: 0.95 },
        ...(!low
          ? [
              {
                position: [side * 5.22, 2.6, -3.9] as [number, number, number],
                scale: 0.5,
              },
            ]
          : []),
      ]),
    [low],
  );
  const island = config.fixtures.find((f) => f.kind === "island");
  const cakes = useMemo<Placement[]>(
    () =>
      island
        ? [-1.1, 0, 1.1].map((z) => ({
            position: [island.x, 1.12, island.z + z],
            scale: 3,
            rotation: z,
          }))
        : [],
    [island],
  );
  return (
    <group>
      <Instances low={low} name="croissant" placements={bread} />
      <Instances low={low} name="potted_plant_01" placements={plants} />
      {cakes.length > 0 && (
        <Instances low={low} name="carrot_cake" placements={cakes} />
      )}
    </group>
  );
}
