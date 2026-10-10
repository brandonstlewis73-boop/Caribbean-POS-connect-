"use client";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  createContext,
  useContext,
} from "react";
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import type { Placement, WorldConfig } from "@/lib/immersive/world";
import { money } from "@/lib/constants";
import { saleUnitPrice } from "@/lib/pos-checkout";
const LightMaterials = createContext(false);
type Surface = "wood" | "stone" | "plaster" | "plain";
const surfaceMaps = new Map<Surface, CanvasTexture>();
function getSurfaceMap(surface: Surface = "plain") {
  const cached = surfaceMaps.get(surface);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    data = ctx.createImageData(256, 256);
  let seed = 41;
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed % 9) - 4;
      const vein = Math.sin(x * 0.06 + Math.sin(y * 0.025) * 2.5);
      const grain = Math.sin(y * 0.65 + Math.sin(x * 0.02) * 1.8);
      const value =
        surface === "wood"
          ? 216 + grain * 13 + noise
          : surface === "stone"
            ? 245 - Math.pow(Math.abs(vein), 28) * 18 + noise * 0.25
            : 247 + noise * 0.5;
      const at = (y * 256 + x) * 4;
      data.data[at] = data.data[at + 1] = data.data[at + 2] = value;
      data.data[at + 3] = 255;
    }
  ctx.putImageData(data, 0, 0);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  surfaceMaps.set(surface, map);
  return map;
}
type Box = {
  p: [number, number, number];
  s: [number, number, number];
  r?: number;
};
function Boxes({
  boxes,
  color,
  roughness = 0.7,
  metalness = 0,
  rounded = false,
  surface = "plain",
}: {
  boxes: Box[];
  color: string;
  roughness?: number;
  metalness?: number;
  rounded?: boolean;
  surface?: Surface;
}) {
  const ref = useRef<InstancedMesh>(null);
  const low = useContext(LightMaterials);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const object = new Object3D();
    boxes.forEach((box, i) => {
      object.position.set(...box.p);
      object.scale.set(...box.s);
      object.rotation.set(0, box.r || 0, 0);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
      const c = new Color(color);
      c.multiplyScalar(0.94 + (i % 5) * 0.025);
      ref.current!.setColorAt(i, c);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [boxes, color]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, boxes.length]}
      castShadow
      receiveShadow
    >
      {rounded ? (
        <sphereGeometry args={[0.5, 10, 7]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      {low ? (
        <meshLambertMaterial map={getSurfaceMap(surface)} color="#ffffff" />
      ) : (
        <meshStandardMaterial
          map={getSurfaceMap(surface)}
          bumpMap={
            surface === "wood" || surface === "stone"
              ? getSurfaceMap(surface)
              : undefined
          }
          bumpScale={surface === "wood" ? 0.012 : 0.004}
          color="#ffffff"
          roughness={roughness}
          metalness={metalness}
        />
      )}
    </instancedMesh>
  );
}
function Sign({
  text,
  subtext = "",
  position,
  rotation = 0,
  width = 3,
  height = 0.75,
  dark = false,
}: {
  text: string;
  subtext?: string;
  position: [number, number, number];
  rotation?: number;
  width?: number;
  height?: number;
  dark?: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    // Small shelf labels need a quarter of the GPU memory of the wall sign.
    const scale = width < 2 ? 0.5 : 1;
    canvas.width = 1024 * scale;
    canvas.height = 256 * scale;
    const c = canvas.getContext("2d")!;
    c.scale(scale, scale);
    c.fillStyle = dark ? "#244b3c" : "#f2e8d6";
    c.fillRect(0, 0, 1024, 256);
    c.textAlign = "center";
    c.fillStyle = dark ? "#fff4da" : "#244b3c";
    let size = 78;
    do {
      c.font = `600 ${size}px Georgia`;
      size -= 2;
    } while (c.measureText(text).width > 950 && size > 22);
    c.fillText(text, 512, subtext ? 122 : 153);
    if (subtext) {
      c.font = "30px sans-serif";
      c.fillText(subtext, 512, 192);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [text, subtext, dark, width]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}
function ProductDisplay({
  placement,
  currency,
  selected,
}: {
  placement: Placement;
  currency: string;
  selected: boolean;
}) {
  const [texture, setTexture] = useState<Texture | null>(null),
    p = placement.product;
  useEffect(() => {
    setTexture(null);
    if (!p.image_url) return;
    let alive = true,
      loaded: Texture | null = null;
    new TextureLoader().load(
      p.image_url,
      (t) => {
        // Bound GPU memory independently of the merchant's original image size.
        const image = t.image as HTMLImageElement;
        if (Math.max(image.width, image.height) > 512) {
          const scale = 512 / Math.max(image.width, image.height);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas
            .getContext("2d")
            ?.drawImage(image, 0, 0, canvas.width, canvas.height);
          (t as Texture<HTMLImageElement | HTMLCanvasElement>).image = canvas;
          t.needsUpdate = true;
        }
        loaded = t;
        t.colorSpace = SRGBColorSpace;
        if (alive) setTexture(t);
        else t.dispose();
      },
      undefined,
      () => {
        if (alive) setTexture(null);
      },
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [p.image_url]);
  return (
    <group
      position={[placement.x, placement.y, placement.z]}
      rotation={[0, placement.rotation, 0]}
    >
      <mesh castShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[0.69, 0.73, 0.22]} />
        <meshStandardMaterial
          color={p.stock_quantity > 0 ? "#ddc5a0" : "#9a9a92"}
          roughness={0.82}
        />
      </mesh>
      <mesh position={[0, 0.12, 0.115]}>
        <planeGeometry args={[0.61, 0.59]} />
        <meshBasicMaterial
          key={texture?.uuid || "empty"}
          map={texture}
          color={texture ? "#ffffff" : "#3f6952"}
          toneMapped={false}
        />
      </mesh>
      <Sign
        text={p.name}
        subtext={
          p.stock_quantity > 0 ? money(saleUnitPrice(p), currency) : "Sold out"
        }
        position={[0, -0.4, 0.18]}
        width={0.94}
        height={0.23}
      />
      {selected ? (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.44, 24]} />
          <meshBasicMaterial color="#e9c274" transparent opacity={0.9} />
        </mesh>
      ) : null}
    </group>
  );
}
function StoreEnvironment({
  low,
  config,
  placements,
  currency,
  nearby,
}: {
  low: boolean;
  config: WorldConfig;
  placements: Placement[];
  currency: string;
  nearby: string | null;
}) {
  const floor = useMemo(
    () =>
      Array.from(
        { length: 168 },
        (_, i): Box => ({
          p: [-5.55 + (i % 12) * 1.01, -0.045, -6.5 + Math.floor(i / 12)],
          s: [0.995, 0.09, 0.985],
        }),
      ),
    [],
  );
  const planks = useMemo(
    () =>
      [-5.28, 5.28].flatMap((x) =>
        [0.25, 0.85, 1.85, 2.55].map(
          (y): Box => ({ p: [x, y, -1], s: [1.08, 0.1, 8.3] }),
        ),
      ),
    [],
  );
  const posts = useMemo(
    () =>
      [-5.7, 5.7].flatMap((x) =>
        [-5.1, -2.4, 0.3, 3.1].map(
          (z): Box => ({ p: [x, 1.3, z], s: [0.11, 2.7, 0.1] }),
        ),
      ),
    [],
  );
  const beams = useMemo(
    () =>
      [-4, -1, 2, 5].map((z): Box => ({ p: [0, 4.08, z], s: [12, 0.2, 0.22] })),
    [],
  );
  const goods = useMemo(
    () =>
      [-5.25, 5.25].flatMap((x) =>
        [0.43, 2.05].flatMap((y) =>
          Array.from(
            { length: 20 },
            (_, i): Box => ({
              p: [x, y, -4.7 + i * 0.39],
              s: [0.25, 0.27 + (i % 3) * 0.07, 0.25],
            }),
          ),
        ),
      ),
    [],
  );
  const loaves = useMemo(
    () =>
      [-5.2, 5.2].flatMap((x) =>
        Array.from(
          { length: 18 },
          (_, i): Box => ({
            p: [x, 0.99, -4.7 + i * 0.43],
            s: [0.5, 0.21, 0.3],
            r: ((i % 3) - 1) * 0.12,
          }),
        ),
      ),
    [],
  );
  const foliage = useMemo(
    () =>
      [-4.8, 4.8].flatMap((x) =>
        Array.from(
          { length: 22 },
          (_, i): Box => ({
            p: [
              x + Math.sin(i * 1.4) * 0.28,
              2.65 + (i % 6) * 0.08,
              -4.5 + Math.cos(i * 0.7) * 0.3,
            ],
            s: [0.23, 0.11, 0.38],
            r: i,
          }),
        ),
      ),
    [],
  );
  return (
    <LightMaterials.Provider value={low}>
      <group>
        <Boxes boxes={loaves} color="#bf8445" rounded />
        <Boxes boxes={foliage} color="#3d6747" rounded />
        <Boxes
          boxes={[{ p: [0, 3, -6.91], s: [5.7, 1.65, 0.09] }]}
          color="#92734d"
        />
        <Boxes boxes={floor} color="#e1d8c8" roughness={0.62} surface="stone" />
        <Boxes
          boxes={[
            { p: [0, 2.15, -7], s: [12, 4.3, 0.15] },
            { p: [-6, 2.15, 0], s: [0.15, 4.3, 14] },
            { p: [6, 2.15, 0], s: [0.15, 4.3, 14] },
            { p: [0, 4.3, 0], s: [12, 0.12, 14] },
          ]}
          color={config.wall}
          surface="plaster"
        />
        <Boxes boxes={planks} color={config.wood} surface="wood" />
        <Boxes boxes={posts} color="#b99552" metalness={0.6} roughness={0.35} />
        <Boxes boxes={beams} color="#795d44" surface="wood" />
        <Boxes boxes={goods} color="#d0ae73" />
        <Boxes
          boxes={[
            { p: [-5.88, 0.13, 0], s: [0.08, 0.24, 14] },
            { p: [5.88, 0.13, 0], s: [0.08, 0.24, 14] },
            { p: [0, 0.13, -6.87], s: [12, 0.24, 0.08] },
          ]}
          color={config.accent}
        />
        <Boxes
          boxes={[-1, 1].flatMap(
            (side) =>
              [
                { p: [side * 5.84, 0.76, 4.6], s: [0.08, 0.1, 2.3] },
                { p: [side * 5.84, 3.45, 4.6], s: [0.08, 0.1, 2.3] },
                { p: [side * 5.84, 2.1, 3.48], s: [0.08, 2.7, 0.08] },
                { p: [side * 5.84, 2.1, 5.72], s: [0.08, 2.7, 0.08] },
                { p: [side * 5.82, 2.1, 4.6], s: [0.08, 2.7, 0.055] },
                { p: [side * 5.82, 2.1, 4.6], s: [0.08, 0.055, 2.2] },
              ] as Box[],
          )}
          color="#eee8d9"
        />
        <Sign
          text="BAKED & BOXED"
          subtext="Browse the shelves · Choose your favorites"
          position={[3.35, 2.3, -6.87]}
          width={2.4}
          height={0.9}
          dark
        />
        <Boxes
          boxes={[
            { p: [-3.9, 1.16, -5.45], s: [0.55, 0.14, 0.4] },
            { p: [-3.9, 1.24, -5.45], s: [0.48, 0.025, 0.34] },
            { p: [-1.05, 1.2, -5.45], s: [0.3, 0.28, 0.22] },
          ]}
          color="#dac8a8"
        />
        {config.fixtures
          .filter((f) => f.kind === "counter" || f.kind === "island")
          .map((f, i) => (
            <group key={i}>
              <Boxes
                boxes={[{ p: [f.x, 0.5, f.z], s: [f.width, 1, f.depth] }]}
                color={config.accent}
              />
              <Boxes
                boxes={Array.from(
                  { length: Math.max(2, Math.floor(f.width)) },
                  (_, n): Box => ({
                    p: [
                      f.x -
                        f.width / 2 +
                        ((n + 0.5) * f.width) /
                          Math.max(2, Math.floor(f.width)),
                      0.5,
                      f.z + f.depth / 2 + 0.022,
                    ],
                    s: [
                      f.width / Math.max(2, Math.floor(f.width)) - 0.16,
                      0.52,
                      0.035,
                    ],
                  }),
                )}
                color={config.accent}
              />
              <Boxes
                boxes={[
                  {
                    p: [f.x, 1.04, f.z],
                    s: [f.width + 0.14, 0.12, f.depth + 0.14],
                  },
                ]}
                color="#eee4d1"
                surface="stone"
                roughness={0.3}
              />
              <Boxes
                boxes={[
                  {
                    p: [f.x, 0.15, f.z + f.depth / 2 + 0.02],
                    s: [f.width, 0.025, 0.035],
                  },
                  {
                    p: [f.x, 0.85, f.z + f.depth / 2 + 0.02],
                    s: [f.width, 0.025, 0.035],
                  },
                ]}
                color="#c8a761"
                metalness={0.7}
              />
              {i > 0 ? (
                <>
                  <Boxes
                    boxes={[-1, 1].flatMap(
                      (side) =>
                        [
                          {
                            p: [
                              f.x + side * (f.width / 2 - 0.1),
                              1.36,
                              f.z - f.depth / 2 + 0.12,
                            ],
                            s: [0.045, 0.56, 0.045],
                          },
                          {
                            p: [
                              f.x + side * (f.width / 2 - 0.1),
                              1.36,
                              f.z + f.depth / 2 - 0.12,
                            ],
                            s: [0.045, 0.56, 0.045],
                          },
                          {
                            p: [f.x + side * (f.width / 2 - 0.1), 1.64, f.z],
                            s: [0.045, 0.035, f.depth - 0.2],
                          },
                        ] as Box[],
                    )}
                    color="#b99a61"
                    metalness={0.55}
                    roughness={0.3}
                  />
                  <mesh position={[f.x, 1.65, f.z]}>
                    <boxGeometry
                      args={[f.width - 0.16, 0.025, f.depth - 0.1]}
                    />
                    <meshStandardMaterial
                      color="#dcece5"
                      transparent
                      opacity={0.14}
                      roughness={0.18}
                      depthWrite={false}
                    />
                  </mesh>
                </>
              ) : null}
              {i > 0
                ? [-1.1, 0, 1.1].map((z) => (
                    <group key={z} position={[f.x, 1.18, f.z + z]}>
                      <mesh castShadow>
                        <cylinderGeometry args={[0.42, 0.44, 0.13, 20]} />
                        <meshStandardMaterial color="#5c3422" roughness={0.9} />
                      </mesh>
                      <mesh position={[0, 0.09, 0]}>
                        <cylinderGeometry args={[0.39, 0.41, 0.07, 20]} />
                        <meshStandardMaterial color="#e4b989" />
                      </mesh>
                    </group>
                  ))
                : null}
            </group>
          ))}
        <Sign
          text={config.name}
          subtext="Welcome. Take a look around."
          position={[0, 3, -6.83]}
          width={5.2}
          height={1.3}
        />
        <Sign
          text="Checkout"
          position={[-2.5, 0.72, -4.91]}
          width={1.4}
          height={0.36}
          dark
        />
        <mesh position={[-2.9, 1.28, -5.45]} rotation={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.38, 0.12]} />
          <meshStandardMaterial color="#172a26" />
        </mesh>
        {[-3, 0, 3].map((x) => (
          <group key={x} position={[x, 3.35, -1]}>
            <mesh position={[0, 0.48, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.9, 6]} />
              <meshStandardMaterial color="#463727" />
            </mesh>
            <mesh>
              <coneGeometry args={[0.34, 0.28, 20, 1, true]} />
              <meshStandardMaterial
                color="#bd974a"
                metalness={0.65}
                roughness={0.32}
              />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
              <sphereGeometry args={[0.09, 12, 8]} />
              <meshStandardMaterial
                color="#fff1cd"
                emissive="#ffd495"
                emissiveIntensity={2}
              />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 4.8, 0, 5.5]}>
            <mesh position={[0, 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.33, 0.25, 0.5, 16]} />
              <meshStandardMaterial color="#c6b69a" />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh
                key={i}
                position={[
                  Math.sin(i * 2) * 0.17,
                  0.65 + i * 0.08,
                  Math.cos(i * 2) * 0.17,
                ]}
                rotation={[0.35, i * 2, 0.3]}
                castShadow
              >
                <sphereGeometry args={[0.18, 8, 6]} />
                <meshStandardMaterial color={i % 2 ? "#52774c" : "#345e3c"} />
              </mesh>
            ))}
          </group>
        ))}
        <Boxes
          boxes={[
            { p: [-5.88, 2.1, 4.6], s: [0.03, 2.7, 2.2] },
            { p: [5.88, 2.1, 4.6], s: [0.03, 2.7, 2.2] },
          ]}
          color="#b8d4d2"
          roughness={0.3}
        />
        {placements.map((p) => (
          <ProductDisplay
            key={p.product.id}
            placement={p}
            currency={currency}
            selected={nearby === p.product.id}
          />
        ))}
      </group>
    </LightMaterials.Provider>
  );
}

export const Environment = memo(StoreEnvironment);
