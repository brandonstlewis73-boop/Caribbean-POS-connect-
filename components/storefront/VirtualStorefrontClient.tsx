"use client";

/* eslint-disable @next/next/no-img-element */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/constants";
import type { Category, Product, Settings } from "@/lib/types";

type Props = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  onAddToCart: (product: Product) => void;
  onExit: () => void;
};

const themeAccents: Record<string, { floor: string; wall: string; shelf: string; accent: string }> = {
  caribbean: { floor: "#082236", wall: "#071421", shelf: "#0f3b4c", accent: "#12D6DF" },
  "modern-retail": { floor: "#111827", wall: "#0B1220", shelf: "#243244", accent: "#48F3F8" },
  cafe: { floor: "#1e1510", wall: "#130f0c", shelf: "#56351f", accent: "#F5C451" },
  restaurant: { floor: "#171717", wall: "#0b1018", shelf: "#34211b", accent: "#FFD978" },
  grocery: { floor: "#10251d", wall: "#071421", shelf: "#174734", accent: "#34d399" },
  beauty: { floor: "#241827", wall: "#120d18", shelf: "#4b2d50", accent: "#f0abfc" },
  clothing: { floor: "#121826", wall: "#071421", shelf: "#24385f", accent: "#60a5fa" }
};

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}

function createProductLabel(product: Product, currency: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createLinearGradient(0, 0, 512, 320);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(1, "#dff7f8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = "#071421";
  ctx.font = "900 40px Arial";
  ctx.fillText(product.name.slice(0, 22), 34, 82);
  ctx.fillStyle = "#0f766e";
  ctx.font = "800 30px Arial";
  ctx.fillText(money(product.selling_price, currency), 34, 134);
  ctx.fillStyle = "#64748b";
  ctx.font = "700 22px Arial";
  ctx.fillText((product.category || "Product").slice(0, 30), 34, 178);
  ctx.fillStyle = "#071421";
  ctx.fillRect(34, 232, 170, 48);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 22px Arial";
  ctx.fillText("View / Add", 58, 263);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function CameraRig({ aisle, yaw }: { aisle: number; yaw: number }) {
  useFrame(({ camera }) => {
    const targetZ = 7 - aisle * 1.8;
    camera.position.x += (Math.sin(yaw) * 1.7 - camera.position.x) * 0.08;
    camera.position.y += (2.1 - camera.position.y) * 0.08;
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.lookAt(Math.sin(yaw) * 1.8, 1.2, 0);
  });
  return null;
}

function ProductCard({ product, index, currency, onSelect }: { product: Product; index: number; currency: string; onSelect: (product: Product) => void }) {
  const label = useMemo(() => createProductLabel(product, currency), [product, currency]);
  const row = Math.floor(index / 4);
  const column = index % 4;
  const side = column < 2 ? -1 : 1;
  const x = side * (2.25 + (column % 2) * 1.25);
  const z = 3.2 - row * 1.55;
  const y = 1.45 + (index % 2) * 0.12;
  const rotationY = side < 0 ? Math.PI / 5 : -Math.PI / 5;
  const cardRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (cardRef.current) cardRef.current.position.y = y + Math.sin(clock.elapsedTime * 1.2 + index) * 0.025;
  });

  return (
    <group ref={cardRef} position={[x, y, z]} rotation={[0, rotationY, 0]} onClick={() => onSelect(product)}>
      <mesh position={[0, -0.16, -0.05]}>
        <boxGeometry args={[1.65, 0.12, 0.18]} />
        <meshStandardMaterial color="#0f2738" roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh>
        <planeGeometry args={[1.55, 0.98]} />
        <meshStandardMaterial map={label} roughness={0.35} metalness={0.04} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[1.7, 1.08, 0.08]} />
        <meshStandardMaterial color="#123142" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
}

function StoreScene({ products, settings, onSelect, aisle, yaw }: { products: Product[]; settings: Settings; onSelect: (product: Product) => void; aisle: number; yaw: number }) {
  const theme = themeAccents[String(settings.storefront_3d_theme || "caribbean")] || themeAccents.caribbean;
  const background = settings.storefront_3d_background || theme.wall;
  const lightIntensity = settings.storefront_3d_lighting === "bright" ? 1.35 : settings.storefront_3d_lighting === "evening" ? 0.72 : 1;

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 7, 15]} />
      <ambientLight intensity={0.62 * lightIntensity} />
      <directionalLight position={[3, 5, 4]} intensity={1.2 * lightIntensity} color="#ffffff" />
      <pointLight position={[-3, 2.8, 2]} intensity={0.75} color={theme.accent} distance={7} />
      <pointLight position={[3, 2.8, -2]} intensity={0.48} color="#F5C451" distance={7} />
      <CameraRig aisle={aisle} yaw={yaw} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.4]}>
        <planeGeometry args={[9, 13]} />
        <meshStandardMaterial color={theme.floor} roughness={0.56} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.25, -5.6]}>
        <boxGeometry args={[9, 4.5, 0.16]} />
        <meshStandardMaterial color={theme.wall} roughness={0.6} />
      </mesh>
      <mesh position={[-4.4, 1.55, -0.3]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[11, 3.1, 0.16]} />
        <meshStandardMaterial color={theme.shelf} roughness={0.58} />
      </mesh>
      <mesh position={[4.4, 1.55, -0.3]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[11, 3.1, 0.16]} />
        <meshStandardMaterial color={theme.shelf} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.06, 3.7]}>
        <boxGeometry args={[3.4, 0.12, 1]} />
        <meshStandardMaterial color="#F5C451" roughness={0.35} metalness={0.22} />
      </mesh>
      {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} currency={settings.currency} onSelect={onSelect} />)}
    </>
  );
}

export default function VirtualStorefrontClient({ products, categories, settings, onAddToCart, onExit }: Props) {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aisle, setAisle] = useState(0);
  const [yaw, setYaw] = useState(0);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false).slice(0, 16), [products]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  useEffect(() => setWebglReady(supportsWebGL()), []);

  if (webglReady === false) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-lg font-black text-slate-950">3D Store is unavailable on this browser.</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">You can still shop normally with the standard storefront.</p>
        <Button type="button" onClick={onExit} className="mt-4">Shop Normally</Button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#071421]/95 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-10 w-10 rounded-2xl bg-white object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{settings.business_name}</p>
            <p className="text-xs font-bold text-cyan-100/65">3D Storefront - drag to look around</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onExit}>Shop Normally</Button>
          <Badge tone="green">Live products only</Badge>
        </div>
      </div>
      <div
        className="relative h-[520px] min-h-[70vh] touch-pan-y bg-[#071421] sm:min-h-0"
        onPointerDown={(event) => { drag.current = { x: event.clientX, yaw }; }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const delta = (event.clientX - drag.current.x) / 280;
          setYaw(Math.max(-0.7, Math.min(0.7, drag.current.yaw + delta)));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {webglReady === null ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#071421] text-center text-white">
            <div>
              <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="mx-auto h-16 w-16 rounded-3xl bg-white object-contain p-2" />
              <p className="mt-4 text-lg font-black">Loading 3D storefront...</p>
            </div>
          </div>
        ) : null}
        <Canvas camera={{ position: [0, 2.1, 7], fov: 48 }} dpr={[1, 1.5]} performance={{ min: 0.45 }} gl={{ antialias: true, powerPreference: "default" }}>
          <StoreScene products={visibleProducts} settings={settings} onSelect={setSelectedProduct} aisle={aisle} yaw={yaw} />
        </Canvas>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#071421] via-[#071421]/70 to-transparent p-4 text-white">
          <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-3 gap-2 rounded-full border border-white/10 bg-white/10 p-2 backdrop-blur-md">
            <button type="button" onClick={() => setAisle((value) => Math.max(0, value - 1))} className="min-h-11 rounded-full bg-white/10 text-sm font-black text-white">Back</button>
            <button type="button" onClick={() => setYaw(0)} className="min-h-11 rounded-full bg-cyan-300 text-sm font-black text-slate-950">Center</button>
            <button type="button" onClick={() => setAisle((value) => Math.min(4, value + 1))} className="min-h-11 rounded-full bg-white/10 text-sm font-black text-white">Forward</button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-white/10 bg-[#071421] p-4 text-white sm:grid-cols-3">
        <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold text-cyan-50/75">Tap a product card to view details and add it to your cart.</p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold text-cyan-50/75">Products shown: {visibleProducts.length}. Normal checkout remains available.</p>
        <p className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-sm font-semibold text-cyan-50/75">Theme: {String(settings.storefront_3d_theme || "caribbean").replace(/-/g, " ")}</p>
      </div>
      {selectedProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 sm:place-items-center">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white shadow-2xl">
            {selectedProduct.image_url ? (
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className="h-52 w-full object-cover" />
            ) : (
              <div className="grid h-44 place-items-center bg-gradient-to-br from-teal-50 to-amber-50 text-5xl font-black text-teal-700">POS</div>
            )}
            <div className="grid gap-4 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{categoryNameById.get(selectedProduct.category_id || "") || selectedProduct.category || "Product"}</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{selectedProduct.name}</h3>
                <p className="mt-2 text-xl font-black text-teal-700">{money(selectedProduct.selling_price, settings.currency)}</p>
                {selectedProduct.description ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{selectedProduct.description}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={() => setSelectedProduct(null)}>Close</Button>
                <Button type="button" variant="primary" onClick={() => { onAddToCart(selectedProduct); setSelectedProduct(null); }}>Add to cart</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
