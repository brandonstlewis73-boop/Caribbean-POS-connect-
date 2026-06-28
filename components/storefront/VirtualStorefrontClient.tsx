"use client";

/* eslint-disable @next/next/no-img-element */

import { Canvas } from "@react-three/fiber";
import { ContactShadows, RoundedBox, Text } from "@react-three/drei";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

type StoreTheme = {
  accent: string;
  gold: string;
  wall: string;
  wood: string;
  shelf: string;
  floor: string;
};

type Hotspot = {
  id: string;
  product: Product;
  x: number;
  y: number;
  index: number;
  size: "sm" | "md" | "lg";
  kind: "package" | "tray" | "stack";
};

const STORE_THEMES: Record<string, StoreTheme> = {
  caribbean: { accent: "#12D6DF", gold: "#F5C451", wall: "#241610", wood: "#8a5429", shelf: "#0f3143", floor: "#eee8df" },
  "modern-retail": { accent: "#48F3F8", gold: "#F5C451", wall: "#111827", wood: "#6b4a31", shelf: "#172033", floor: "#edf2f7" },
  cafe: { accent: "#14b8a6", gold: "#F5C451", wall: "#332016", wood: "#8b5a35", shelf: "#4c2d1f", floor: "#f2e8dc" },
  restaurant: { accent: "#12D6DF", gold: "#FFD978", wall: "#2b201c", wood: "#7a4b32", shelf: "#2b201c", floor: "#eee7df" },
  grocery: { accent: "#34d399", gold: "#F5C451", wall: "#183325", wood: "#5d6b37", shelf: "#174734", floor: "#e5f3e8" },
  beauty: { accent: "#f0abfc", gold: "#F5C451", wall: "#352039", wood: "#6f3f76", shelf: "#4b2d50", floor: "#f7edf7" },
  clothing: { accent: "#60a5fa", gold: "#F5C451", wall: "#1d2a41", wood: "#38598a", shelf: "#1d3357", floor: "#edf2fb" }
};

const HOTSPOT_SLOTS = [
  { x: 18, y: 48, size: "sm" as const },
  { x: 28, y: 41, size: "sm" as const },
  { x: 40, y: 69, size: "lg" as const },
  { x: 52, y: 65, size: "lg" as const },
  { x: 66, y: 42, size: "sm" as const },
  { x: 78, y: 49, size: "sm" as const },
  { x: 58, y: 76, size: "md" as const },
  { x: 33, y: 77, size: "md" as const }
];

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function themeFor(settings: Settings): StoreTheme {
  const selected = String(settings.storefront_3d_theme || settings.business_type || "caribbean").toLowerCase();
  const base = STORE_THEMES[selected] || STORE_THEMES.caribbean;
  const accent = settings.business_color && /^#?[0-9a-f]{6}$/i.test(settings.business_color)
    ? settings.business_color.startsWith("#") ? settings.business_color : `#${settings.business_color}`
    : base.accent;
  return { ...base, accent };
}

function toneFor(product: Product) {
  const name = product.name.toLowerCase();
  if (name.includes("pink") || name.includes("strawberry") || name.includes("rose")) return { fill: "#f43f8a", soft: "#ffe4f1", deep: "#9d174d" };
  if (name.includes("chocolate") || name.includes("brownie") || name.includes("cocoa")) return { fill: "#6b341f", soft: "#c08457", deep: "#25140f" };
  return { fill: "#12D6DF", soft: "#dcfbff", deep: "#0f766e" };
}

function kindFor(product: Product, index: number): Hotspot["kind"] {
  const name = product.name.toLowerCase();
  if (name.includes("brownie") || name.includes("chocolate") || name.includes("cake")) return "tray";
  if (name.includes("pink") || name.includes("sweet") || name.includes("candy")) return "stack";
  return index % 3 === 0 ? "tray" : "package";
}

function makeHotspots(products: Product[]): Hotspot[] {
  if (!products.length) return [];
  return HOTSPOT_SLOTS.map((slot, index) => {
    const product = products[index % products.length];
    return {
      id: `${product.id}-hotspot-${index}`,
      product,
      x: slot.x,
      y: slot.y,
      index,
      size: slot.size,
      kind: kindFor(product, index)
    };
  });
}

function StoreLighting({ theme }: { theme: StoreTheme }) {
  return (
    <>
      <ambientLight intensity={0.55} color="#fff7e8" />
      <directionalLight position={[0, 5.8, 4.8]} intensity={1.6} color="#fff1d6" castShadow />
      <pointLight position={[-2.8, 2.4, 1.4]} intensity={1.1} color={theme.accent} distance={5.8} />
      <pointLight position={[2.8, 2.6, -1.8]} intensity={0.9} color={theme.gold} distance={5.6} />
      <spotLight position={[0, 4.4, -1.6]} angle={0.45} penumbra={0.72} intensity={1.7} color="#fff3d6" castShadow />
    </>
  );
}

function StoreSceneBackground({ settings, theme }: { settings: Settings; theme: StoreTheme }) {
  const businessName = safeBusinessName(settings);
  return (
    <group>
      <mesh receiveShadow position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.4, 7.6]} />
        <meshStandardMaterial color={theme.floor} roughness={0.72} metalness={0.04} />
      </mesh>
      <mesh receiveShadow position={[0, 1.75, -3.05]}>
        <boxGeometry args={[8.4, 3.8, 0.16]} />
        <meshStandardMaterial color={theme.wall} roughness={0.6} />
      </mesh>
      <mesh receiveShadow position={[-4.12, 1.45, -0.2]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.18, 2.9, 5.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.52} />
      </mesh>
      <mesh receiveShadow position={[4.12, 1.45, -0.2]} rotation={[0, -0.35, 0]}>
        <boxGeometry args={[0.18, 2.9, 5.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.52} />
      </mesh>
      <mesh position={[0, 2.35, -2.94]}>
        <boxGeometry args={[3.7, 1.15, 0.18]} />
        <meshStandardMaterial color="#071421" roughness={0.42} metalness={0.08} />
      </mesh>
      <Text position={[0, 2.55, -2.83]} fontSize={0.34} maxWidth={3.2} textAlign="center" color="#F8FAFC" anchorX="center" anchorY="middle">
        {businessName}
      </Text>
      <Text position={[0, 2.23, -2.82]} fontSize={0.11} maxWidth={3.1} textAlign="center" color={theme.accent} anchorX="center" anchorY="middle">
        PREMIUM VIRTUAL STOREFRONT
      </Text>
      <mesh position={[0, 1.78, -2.82]}>
        <boxGeometry args={[3.6, 0.035, 0.08]} />
        <meshStandardMaterial color={theme.gold} emissive={theme.gold} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function StoreShelfWall({ side, theme }: { side: "left" | "right"; theme: StoreTheme }) {
  const x = side === "left" ? -2.85 : 2.85;
  const rotation = side === "left" ? 0.18 : -0.18;
  return (
    <group position={[x, 1.15, -1.18]} rotation={[0, rotation, 0]}>
      <RoundedBox args={[1.38, 2.08, 0.32]} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={theme.shelf} roughness={0.48} metalness={0.08} />
      </RoundedBox>
      {[0.42, 0, -0.44].map((y) => (
        <mesh key={y} position={[0, y, 0.24]} castShadow>
          <boxGeometry args={[1.46, 0.06, 0.5]} />
          <meshStandardMaterial color={theme.wood} roughness={0.52} />
        </mesh>
      ))}
      <mesh position={[0, 0.86, 0.3]}>
        <boxGeometry args={[1.1, 0.035, 0.08]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function StoreBackWall({ settings, theme }: { settings: Settings; theme: StoreTheme }) {
  return <StoreSceneBackground settings={settings} theme={theme} />;
}

function ProductDisplayIsland({ theme }: { theme: StoreTheme }) {
  return (
    <group position={[0, 0.46, 0.98]}>
      <RoundedBox args={[2.72, 0.56, 1.2]} radius={0.12} smoothness={5} castShadow receiveShadow>
        <meshStandardMaterial color="#111827" roughness={0.45} metalness={0.08} />
      </RoundedBox>
      <mesh position={[0, 0.32, 0]}>
        <boxGeometry args={[2.46, 0.05, 1.02]} />
        <meshStandardMaterial color={theme.wood} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.04, 0.63]}>
        <boxGeometry args={[2.28, 0.04, 0.06]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

function StoreAtmosphere({ theme }: { theme: StoreTheme }) {
  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <fog attach="fog" args={["#f8fafc", 7.5, 10.5]} />
      <StoreLighting theme={theme} />
    </>
  );
}

function PlantDecor({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? -3.42 : 3.42;
  return (
    <group position={[x, 0.25, 1.32]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.48, 16]} />
        <meshStandardMaterial color="#172033" roughness={0.55} />
      </mesh>
      {[-0.45, -0.22, 0, 0.22, 0.45].map((rotate) => (
        <mesh key={rotate} position={[0, 0.48, 0]} rotation={[0.55, 0, rotate]} castShadow>
          <boxGeometry args={[0.07, 0.58, 0.025]} />
          <meshStandardMaterial color="#0f766e" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function ProductSceneModel({ unit }: { unit: Hotspot }) {
  const tone = toneFor(unit.product);
  const positionMap = [
    [-2.98, 1.25, -0.85],
    [-2.58, 1.78, -0.9],
    [-0.55, 0.92, 1.0],
    [0.48, 0.92, 1.0],
    [2.52, 1.78, -0.9],
    [2.96, 1.25, -0.85],
    [1.1, 0.92, 0.76],
    [-1.1, 0.92, 0.76]
  ] as const;
  const [x, y, z] = positionMap[unit.index % positionMap.length];

  if (unit.kind === "tray") {
    return (
      <group position={[x, y, z]}>
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.08, 0.28]} />
          <meshStandardMaterial color={tone.deep} roughness={0.52} />
        </mesh>
        {[0, 1, 2].map((piece) => (
          <mesh key={piece} position={[-0.11 + piece * 0.11, 0.07, 0]} castShadow>
            <boxGeometry args={[0.08, 0.07, 0.18]} />
            <meshStandardMaterial color={piece % 2 ? tone.soft : tone.fill} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group position={[x, y, z]}>
      <RoundedBox args={[0.22, 0.36, 0.16]} radius={0.025} smoothness={2} castShadow>
        <meshStandardMaterial color={unit.kind === "stack" ? tone.fill : tone.soft} roughness={0.48} />
      </RoundedBox>
      <mesh position={[0, -0.08, 0.085]}>
        <boxGeometry args={[0.16, 0.04, 0.02]} />
        <meshStandardMaterial color={tone.deep} />
      </mesh>
    </group>
  );
}

function PremiumStoreScene({
  products,
  settings,
  onSelect
}: {
  products: Product[];
  settings: Settings;
  onSelect: (product: Product) => void;
}) {
  const theme = useMemo(() => themeFor(settings), [settings]);
  const hotspots = useMemo(() => makeHotspots(products), [products]);

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
      <div className="relative h-[440px] min-[430px]:h-[500px] md:h-[650px]">
        <Canvas
          shadows
          camera={{ position: [0, 2.05, 5.25], fov: 43 }}
          dpr={[1, 1.6]}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        >
          <StoreAtmosphere theme={theme} />
          <StoreBackWall settings={settings} theme={theme} />
          <StoreShelfWall side="left" theme={theme} />
          <StoreShelfWall side="right" theme={theme} />
          <ProductDisplayIsland theme={theme} />
          <PlantDecor side="left" />
          <PlantDecor side="right" />
          {hotspots.map((unit) => <ProductSceneModel key={unit.id} unit={unit} />)}
          <ContactShadows position={[0, 0.01, 0]} opacity={0.28} scale={7.2} blur={2.4} far={4.2} />
        </Canvas>
        <ProductHotspotLayer hotspots={hotspots} settings={settings} onSelect={onSelect} />
        {!products.length ? (
          <div className="absolute inset-x-4 top-6 z-20 mx-auto max-w-md rounded-[24px] border border-slate-200 bg-white/94 p-5 text-center shadow-xl backdrop-blur-xl">
            <ShoppingBag className="mx-auto h-8 w-8 text-teal-700" />
            <p className="mt-3 text-lg font-black text-slate-950">No products added yet.</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">This store has not published products for the virtual storefront.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShelfProductPackage({ unit, settings, onSelect }: { unit: Hotspot; settings: Settings; onSelect: (product: Product) => void }) {
  const tone = toneFor(unit.product);
  const sizeClass = unit.size === "lg" ? "h-16 w-20 sm:h-20 sm:w-24" : unit.size === "md" ? "h-14 w-16 sm:h-16 sm:w-20" : "h-11 w-12 sm:h-14 sm:w-16";

  return (
    <button
      type="button"
      onClick={() => onSelect(unit.product)}
      className="group relative grid justify-items-center rounded-2xl outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300"
      aria-label={`View ${unit.product.name}`}
    >
      <span className="absolute -inset-2 rounded-full bg-cyan-300/0 blur-xl transition group-hover:bg-cyan-300/35 group-focus-visible:bg-cyan-300/35" />
      {unit.kind === "tray" ? (
        <span className={`${sizeClass} relative grid grid-cols-3 gap-1 rounded-2xl border border-white/50 bg-slate-950/80 p-1 shadow-xl`}>
          {Array.from({ length: 6 }).map((_, index) => <span key={index} className="rounded-md shadow-inner" style={{ backgroundColor: index % 2 ? tone.soft : tone.fill }} />)}
        </span>
      ) : (
        <span className={`${sizeClass} relative overflow-hidden rounded-2xl border border-white/60 shadow-xl`} style={{ background: `linear-gradient(145deg, ${tone.soft}, #fff 55%, ${tone.fill})` }}>
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute inset-x-1.5 top-1.5 h-7 rounded-lg object-cover shadow-sm sm:h-9" /> : null}
          <span className="absolute inset-x-2 bottom-4 h-1.5 rounded-full" style={{ backgroundColor: tone.deep }} />
          <span className="absolute bottom-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/80" />
        </span>
      )}
      <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden min-w-36 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-left shadow-xl backdrop-blur-xl group-hover:block group-focus-visible:block">
        <span className="block truncate text-xs font-black text-slate-950">{unit.product.name}</span>
        <span className="mt-1 block text-xs font-black text-teal-700">{money(unit.product.selling_price, settings.currency)}</span>
      </span>
    </button>
  );
}

function ProductHotspotLayer({ hotspots, settings, onSelect }: { hotspots: Hotspot[]; settings: Settings; onSelect: (product: Product) => void }) {
  return (
    <div className="absolute inset-0 z-10">
      {hotspots.map((unit) => (
        <div key={unit.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${unit.x}%`, top: `${unit.y}%` }}>
          <ShelfProductPackage unit={unit} settings={settings} onSelect={onSelect} />
        </div>
      ))}
    </div>
  );
}

function StoreControls({ onExit }: { onExit: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[24px] border border-slate-200 bg-white/92 p-2 shadow-lg backdrop-blur-xl">
      <p className="px-3 text-xs font-bold leading-5 text-slate-600">Tap glowing shelf items to view products.</p>
      <button type="button" onClick={onExit} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white shadow-lg transition hover:bg-teal-700">Cart</button>
    </div>
  );
}

function MobileStoreControls({ onExit }: { onExit: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[22px] border border-slate-200 bg-white/92 p-2 shadow-lg backdrop-blur-xl md:hidden">
      <p className="px-2 text-[11px] font-bold leading-5 text-slate-600">Tap products in the scene.</p>
      <button type="button" onClick={onExit} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-[11px] font-black text-white">Cart</button>
    </div>
  );
}

function ProductDetailModal({ product, category, settings, onClose, onAddToCart }: { product: Product; category: string; settings: Settings; onClose: () => void; onAddToCart: (product: Product) => void }) {
  const [quantity, setQuantity] = useState(1);
  const addQuantity = useCallback(() => {
    for (let index = 0; index < quantity; index += 1) onAddToCart(product);
    onClose();
  }, [onAddToCart, onClose, product, quantity]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/70 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-56 w-full object-cover sm:h-64" />
          ) : (
            <div className="grid h-52 place-items-center bg-gradient-to-br from-teal-50 via-white to-amber-50 text-teal-700">
              <ShoppingBag className="h-14 w-14" />
            </div>
          )}
          <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-slate-800 shadow-lg" aria-label="Close product details"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{category}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{product.name}</h3>
            <p className="mt-2 text-2xl font-black text-teal-700">{money(product.selling_price, settings.currency)}</p>
            {product.description ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{product.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-black text-slate-700">Quantity</span>
            <div className="flex items-center rounded-full border border-slate-200 bg-white">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center text-slate-600" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="grid h-10 w-10 place-items-center text-sm font-black text-slate-950">{quantity}</span>
              <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="grid h-10 w-10 place-items-center text-slate-600" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={onClose} className="rounded-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50">Keep browsing</Button>
            <Button type="button" variant="primary" onClick={addQuantity} className="rounded-full bg-slate-950 text-white hover:bg-teal-700">Add to cart</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VirtualStore3D({ products, categories, settings, onAddToCart, onExit }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false).slice(0, 24), [products]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const businessName = safeBusinessName(settings);

  return (
    <section className="grid gap-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:rounded-[34px] sm:p-4">
      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-3 text-slate-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm" />
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{businessName}</p>
            <p className="truncate text-xs font-bold text-slate-500">Virtual storefront</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:shrink-0">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">{visibleProducts.length} live products</span>
          <Button type="button" size="sm" onClick={onExit} className="min-w-max rounded-full border-slate-200 bg-white px-4 text-xs text-slate-800 hover:border-teal-300 hover:bg-teal-50">Shop Normally</Button>
        </div>
      </div>
      <PremiumStoreScene products={visibleProducts} settings={settings} onSelect={setSelectedProduct} />
      <div className="hidden md:block"><StoreControls onExit={onExit} /></div>
      <MobileStoreControls onExit={onExit} />
      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          category={categoryNameById.get(selectedProduct.category_id || "") || selectedProduct.category || "Product"}
          settings={settings}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </section>
  );
}
