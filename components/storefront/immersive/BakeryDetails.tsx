"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D, Vector2 } from "three";
import type { WorldConfig } from "@/lib/immersive/world";
import { Boxes } from "./Environment";
type Item = {
  p: [number, number, number];
  s: [number, number, number];
  r?: [number, number, number];
};
function Batch({
  items,
  shape,
  color,
  glass = false,
}: {
  items: Item[];
  shape: "leaf" | "bun" | "jar" | "bottle";
  color: string;
  glass?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const o = new Object3D();
    items.forEach((item, i) => {
      o.position.set(...item.p);
      o.scale.set(...item.s);
      o.rotation.set(...(item.r || [0, 0, 0]));
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  const glassProfile = useMemo(
    () =>
      [
        [0.46, 0],
        [0.46, 0.08],
        [0.45, 0.37],
        [0.4, 0.52],
        [0.27, 0.63],
        [0.08, 0.67],
        [0, 0.67],
      ].map(([x, y]) => new Vector2(x, y)),
    [],
  );
  const bottleProfile = useMemo(
    () =>
      [
        [0, 0],
        [0.1, 0],
        [0.11, 0.04],
        [0.11, 0.29],
        [0.055, 0.34],
        [0.045, 0.47],
        [0, 0.47],
      ].map(([x, y]) => new Vector2(x, y)),
    [],
  );
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      castShadow={!glass}
      receiveShadow
    >
      {shape === "jar" ? (
        <latheGeometry args={[glassProfile, 12]} />
      ) : shape === "bottle" ? (
        <latheGeometry args={[bottleProfile, 10]} />
      ) : (
        <sphereGeometry
          args={[1, shape === "leaf" ? 6 : 10, shape === "leaf" ? 4 : 6]}
        />
      )}
      {glass ? (
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.17}
          depthWrite={false}
          roughness={0.14}
        />
      ) : (
        <meshLambertMaterial color={color} />
      )}
    </instancedMesh>
  );
}
export function BakeryDetails({ config }: { config: WorldConfig }) {
  const island = config.fixtures.find((f) => f.kind === "island");
  const shelves = useMemo(
    () =>
      [0.52, 1.18, 1.84, 2.5].map((y) => ({
        p: [2.65, y, -6.57] as [number, number, number],
        s: [5.2, 0.075, 0.55] as [number, number, number],
      })),
    [],
  );
  const bottles = useMemo(
    () =>
      [-5.2, 5.2].flatMap((x) =>
        Array.from(
          { length: 16 },
          (_, i): Item => ({
            p: [x, 1.92, -4.7 + i * 0.48],
            s: [0.8, 0.8, 0.8],
          }),
        ),
      ),
    [],
  );
  const panelTrim = useMemo(
    () =>
      [-1, 1].flatMap((side) =>
        Array.from({ length: 7 }, (_, i) => ({
          p: [side * 4.69, 0.35, -4.55 + i * 1.08] as [number, number, number],
          s: [0.035, 0.48, 0.88] as [number, number, number],
        })),
      ),
    [],
  );
  return (
    <group>
      <Boxes boxes={shelves} color={config.wood} surface="wood" />
      <Boxes
        boxes={[
          { p: [2.65, 0.25, -6.57], s: [5.2, 0.5, 0.58] },
          ...[-5.25, 5.25].map((x) => ({
            p: [x, 0.3, -1] as [number, number, number],
            s: [1.12, 0.6, 8.25] as [number, number, number],
          })),
        ]}
        color={config.accent}
      />
      <Boxes boxes={panelTrim} color="#526a4c" />
      <Boxes
        boxes={[
          { p: [2.65, 0.07, -6.25], s: [5.2, 0.1, 0.025] },
          ...[-4.68, 4.68].map((x) => ({
            p: [x, 0.075, -1] as [number, number, number],
            s: [0.025, 0.09, 8.2] as [number, number, number],
          })),
        ]}
        color="#bfa367"
        metalness={0.65}
      />
      <Boxes
        boxes={[0.52, 1.18, 1.84, 2.5].map((y) => ({
          p: [2.65, y - 0.045, -6.31],
          s: [5.05, 0.014, 0.025],
        }))}
        color="#ffe4a6"
        unlit
      />
      <Boxes
        boxes={[-4.68, 4.68].flatMap((x) =>
          [0.85, 1.85, 2.55].map((y) => ({
            p: [x, y - 0.06, -1] as [number, number, number],
            s: [0.018, 0.014, 8.1] as [number, number, number],
          })),
        )}
        color="#ffe5ac"
        unlit
      />
      <Batch items={bottles} shape="bottle" color="#85723f" />
      {island && (
        <Batch
          items={[-1.1, 0, 1.1].map((z) => ({
            p: [island.x, 1.11, island.z + z],
            s: [1, 1, 1],
          }))}
          shape="jar"
          color="#edf6ee"
          glass
        />
      )}
    </group>
  );
}
