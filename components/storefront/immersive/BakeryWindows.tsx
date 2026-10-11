"use client";
import { useEffect, useMemo } from "react";
import { Shape, Path, CanvasTexture, SRGBColorSpace } from "three";
function arch(width: number, height: number) {
  const s = new Shape(),
    r = width / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, height - r);
  s.absarc(0, height - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}
export function BakeryWindows() {
  const shape = useMemo(() => arch(2.1, 2.9), []);
  const frame = useMemo(() => {
    const s = arch(2.3, 3.08),
      hole = new Path();
    const inner = arch(2.1, 2.9);
    hole.setFromPoints(inner.getPoints(20).map((p) => p.set(p.x, p.y + 0.08)));
    s.holes.push(hole);
    return s;
  }, []);
  const glass = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 256;
    const x = c.getContext("2d")!;
    const sky = x.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#c5dee0");
    sky.addColorStop(0.5, "#eef0d3");
    sky.addColorStop(1, "#93a873");
    x.fillStyle = sky;
    x.fillRect(0, 0, 128, 256);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => glass.dispose(), [glass]);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 5.81, 0.55, 4.5]}
          rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          <mesh position={[0, 0, -0.025]}>
            <shapeGeometry args={[shape, 20]} />
            <meshBasicMaterial map={glass} />
          </mesh>
          <mesh>
            <extrudeGeometry
              args={[
                frame,
                { depth: 0.08, bevelEnabled: false, curveSegments: 16 },
              ]}
            />
            <meshLambertMaterial color="#765131" />
          </mesh>
          <mesh position={[0, 1.27, 0.035]}>
            <boxGeometry args={[0.055, 2.52, 0.06]} />
            <meshLambertMaterial color="#765131" />
          </mesh>
          {[0.88, 1.72].map((y) => (
            <mesh key={y} position={[0, y, 0.035]}>
              <boxGeometry args={[2.1, 0.055, 0.06]} />
              <meshLambertMaterial color="#765131" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Static window light is a small baked decal: no extra shadow map or dynamic
// lights on phones. It follows the fixed windows, not the moving characters.
export function WindowLight() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.shadowColor = "rgba(255,233,171,.65)";
    c.shadowBlur = 8;
    c.fillStyle = "rgba(255,238,194,.22)";
    for (let x = 0; x < 2; x++)
      for (let y = 0; y < 3; y++)
        c.fillRect(16 + x * 116, 14 + y * 78, 104, 66);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      {[2.6, 4.6].map((z) => (
        <mesh
          key={z}
          position={[-2.8, 0.008, z]}
          rotation={[-Math.PI / 2, 0, -0.48]}
        >
          <planeGeometry args={[4.3, 2.3]} />
          <meshBasicMaterial
            map={texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
