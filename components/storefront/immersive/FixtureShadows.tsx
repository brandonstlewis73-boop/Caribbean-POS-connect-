"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CanvasTexture, InstancedMesh, Object3D } from "three";
import type { WorldConfig } from "@/lib/immersive/world";

/** Static floor contact shading: one draw call, no shadow-camera render pass. */
export function FixtureShadows({ config }: { config: WorldConfig }) {
  const ref = useRef<InstancedMesh>(null);
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    const shade = ctx.createRadialGradient(48, 48, 16, 48, 48, 48);
    shade.addColorStop(0, "rgba(35,28,20,.32)");
    shade.addColorStop(0.6, "rgba(35,28,20,.18)");
    shade.addColorStop(1, "rgba(35,28,20,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 96, 96);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => map.dispose(), [map]);
  useLayoutEffect(() => {
    const object = new Object3D();
    config.fixtures.forEach((fixture, i) => {
      object.position.set(fixture.x, 0.008, fixture.z);
      object.rotation.set(-Math.PI / 2, 0, 0);
      object.scale.set(fixture.width + 0.7, fixture.depth + 0.7, 1);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [config]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, config.fixtures.length]}
      renderOrder={1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
