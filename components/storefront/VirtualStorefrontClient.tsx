"use client";

/* eslint-disable @next/next/no-img-element */

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/constants";
import type { Category, Product, Settings } from "@/lib/types";

type Props = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  onAddToCart: (product: Product) => void;
  onExit: () => void;
  onViewCart?: () => void;
};

type HotspotZone = "shelf" | "centerDisplay" | "counter" | "drinks" | "frozen";

type HotspotPosition = {
  zone: HotspotZone;
  x: number;
  y: number;
  size: "sm" | "md" | "lg";
};

type ProductHotspotData = HotspotPosition & {
  id: string;
  product: Product;
};

const STORE_SCENE_IMAGE = "/storefront/premium-bakery-virtual-store.png";

const HOTSPOT_POSITIONS: HotspotPosition[] = [
  { zone: "shelf", x: 24, y: 47, size: "sm" },
  { zone: "centerDisplay", x: 46, y: 58, size: "md" },
  { zone: "centerDisplay", x: 55, y: 61, size: "sm" },
  { zone: "shelf", x: 73, y: 43, size: "sm" },
  { zone: "drinks", x: 84, y: 57, size: "sm" },
  { zone: "frozen", x: 36, y: 75, size: "sm" },
  { zone: "counter", x: 20, y: 66, size: "sm" },
  { zone: "drinks", x: 88, y: 42, size: "sm" }
];

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function supportsWebGL() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function zoneForProduct(product: Product): HotspotZone | null {
  const text = `${product.name} ${product.category || ""} ${product.description || ""}`.toLowerCase();
  if (text.includes("drink") || text.includes("juice") || text.includes("soda") || text.includes("water") || text.includes("mauby") || text.includes("sorrel")) return "drinks";
  if (text.includes("frozen") || text.includes("ice") || text.includes("freezer")) return "frozen";
  return null;
}

function productHotspots(products: Product[]): ProductHotspotData[] {
  const used = new Set<number>();
  return products.slice(0, HOTSPOT_POSITIONS.length).map((product, index) => {
    const preferredZone = zoneForProduct(product);
    const preferredIndex = preferredZone ? HOTSPOT_POSITIONS.findIndex((position, positionIndex) => position.zone === preferredZone && !used.has(positionIndex)) : -1;
    const fallbackIndex = HOTSPOT_POSITIONS.findIndex((_, positionIndex) => !used.has(positionIndex));
    const positionIndex = preferredIndex >= 0 ? preferredIndex : Math.max(0, fallbackIndex);
    used.add(positionIndex);
    return {
      ...HOTSPOT_POSITIONS[positionIndex],
    id: `${product.id}-scene-hotspot-${index}`,
    product
    };
  });
}

function CartPanel({ count, onExit, onViewCart }: { count: number; onExit: () => void; onViewCart: () => void }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-slate-950/72 p-1.5 shadow-2xl backdrop-blur-xl sm:flex">
      <span className="rounded-full bg-emerald-400/14 px-3 py-2 text-xs font-black text-emerald-100">{count} live products</span>
      <Button type="button" size="sm" onClick={onExit} className="rounded-full border-white/10 bg-white/10 px-4 text-xs text-white hover:bg-white/20">
        Shop Normally
      </Button>
      <Button type="button" size="sm" variant="primary" onClick={onViewCart} className="rounded-full bg-violet-600 px-4 text-xs text-white hover:bg-violet-500">
        View Cart <ShoppingBag className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MobileCartDrawer({ onExit, onViewCart }: { onExit: () => void; onViewCart: () => void }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/92 p-2 shadow-xl shadow-slate-950/10 backdrop-blur-xl sm:hidden">
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <Button type="button" size="sm" onClick={onExit} className="rounded-2xl border-slate-200 bg-white text-xs font-black text-slate-800 hover:bg-slate-50">
          Shop Normally
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={onViewCart} className="rounded-2xl bg-violet-600 text-xs font-black text-white hover:bg-violet-500">
          View Cart
        </Button>
      </div>
    </div>
  );
}

function StoreSceneImage({ settings, productCount, onExit, onViewCart, children }: { settings: Settings; productCount: number; onExit: () => void; onViewCart: () => void; children: ReactNode }) {
  const businessName = safeBusinessName(settings);

  return (
    <div className="relative aspect-[16/10] min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-2xl sm:aspect-[16/9] md:min-h-[640px]">
      <img
        src={STORE_SCENE_IMAGE}
        alt={`${businessName} virtual storefront`}
        className="absolute inset-0 h-full w-full object-cover brightness-[1.12] contrast-[1.06] saturate-[1.05]"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/25 via-transparent to-slate-950/20" />
      <StoreSceneEnhancements />
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-3 rounded-full border border-white/15 bg-slate-950/62 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
          <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black sm:text-base">{businessName}</p>
            <p className="text-xs font-bold text-white/65">Virtual Store</p>
          </div>
        </div>
        <CartPanel count={productCount} onExit={onExit} onViewCart={onViewCart} />
      </div>
      {children}
      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-[24px] border border-white/15 bg-slate-950/62 px-4 py-3 text-center text-xs font-bold text-white/85 shadow-2xl backdrop-blur-xl sm:block">
        Explore Store · Tap product pins
      </div>
    </div>
  );
}

function StoreSceneEnhancements() {
  return (
    <>
      <StoreSign label="Fresh Picks" className="left-[43%] top-[50%]" />
      <ShopperSilhouette variant="shelf" className="left-[68%] top-[53%]" />
      <ShopperSilhouette variant="center" className="left-[50%] top-[66%]" />
      <ShopperSilhouette variant="counter" className="left-[19%] top-[62%]" />
      <ShopperSilhouette variant="cashier" className="left-[13%] top-[48%]" />
      <style jsx>{`
        @keyframes shopper-drift {
          0%, 100% { transform: translate3d(-50%, -50%, 0) translateX(-5px); opacity: 0.68; }
          50% { transform: translate3d(-50%, -50%, 0) translateX(7px); opacity: 0.86; }
        }
      `}</style>
    </>
  );
}

function StoreSign({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-[4] rounded-full border border-violet-100/30 bg-slate-950/46 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-50 shadow-lg shadow-violet-500/15 backdrop-blur-md ${className}`}
    >
      {label}
    </span>
  );
}

function ShopperSilhouette({ className, variant }: { className: string; variant: "shelf" | "center" | "counter" | "cashier" }) {
  const isCashier = variant === "cashier";
  const delay = variant === "shelf" ? "0s" : variant === "center" ? "1.8s" : "3.2s";
  return (
    <div
      className={`pointer-events-none absolute z-[3] hidden -translate-x-1/2 -translate-y-1/2 sm:block ${className}`}
      style={{ animation: isCashier ? undefined : `shopper-drift 7.5s ease-in-out ${delay} infinite` }}
    >
      <div className="relative h-32 w-14 opacity-85">
        <span className="absolute left-1/2 top-0 h-6 w-6 -translate-x-1/2 rounded-full bg-slate-950/82 shadow-lg ring-1 ring-white/15" />
        <span className={`absolute left-1/2 top-6 h-16 w-9 -translate-x-1/2 rounded-t-full ${isCashier ? "bg-slate-950/84" : "bg-slate-800/76"} shadow-xl ring-1 ring-white/10`} />
        <span className={`absolute left-[23px] top-9 h-8 w-2 -rotate-12 rounded-full ${isCashier ? "bg-cyan-100/38" : "bg-white/28"}`} />
        <span className="absolute left-[20px] top-[82px] h-12 w-2 rotate-6 rounded-full bg-slate-950/68" />
        <span className="absolute right-[20px] top-[82px] h-12 w-2 -rotate-6 rounded-full bg-slate-950/68" />
        <span className="absolute left-1/2 bottom-0 h-3 w-14 -translate-x-1/2 rounded-full bg-slate-950/28 blur-sm" />
      </div>
    </div>
  );
}

function ProductHotspotLayer({ hotspots, settings, onSelect }: { hotspots: ProductHotspotData[]; settings: Settings; onSelect: (product: Product) => void }) {
  return (
    <div className="absolute inset-0 z-20">
      {hotspots.map((hotspot) => (
        <ProductHotspot key={hotspot.id} hotspot={hotspot} settings={settings} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ProductHotspot({ hotspot, settings, onSelect }: { hotspot: ProductHotspotData; settings: Settings; onSelect: (product: Product) => void }) {
  const sizeClass = hotspot.size === "lg" ? "h-8 w-8 sm:h-10 sm:w-10" : hotspot.size === "md" ? "h-7 w-7 sm:h-9 sm:w-9" : "h-6 w-6 sm:h-8 sm:w-8";

  return (
    <button
      type="button"
      onClick={() => onSelect(hotspot.product)}
      className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      aria-label={`View ${hotspot.product.name}`}
    >
      <span className="absolute -inset-1.5 rounded-full bg-violet-500/24 blur-md transition group-hover:bg-violet-400/48 group-focus-visible:bg-violet-400/48" />
      <span className="absolute inset-0 rounded-full border border-violet-100/70 opacity-35 motion-safe:animate-ping" />
      <span className={`${sizeClass} relative grid place-items-center overflow-hidden rounded-full border border-white/80 bg-slate-950/82 shadow-lg shadow-violet-950/30 ring-1 ring-violet-200/45 transition group-hover:scale-110 group-focus-visible:scale-110`}>
        <span className="absolute inset-1 rounded-full bg-violet-500/76" />
        {hotspot.product.image_url ? (
          <img src={hotspot.product.image_url} alt="" className="relative h-[70%] w-[70%] rounded-full object-cover shadow-sm" />
        ) : (
          <ShoppingBag className="relative h-3.5 w-3.5 text-white" />
        )}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden min-w-44 -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-950/88 px-3 py-2 text-left text-white shadow-2xl backdrop-blur-xl group-hover:block group-focus-visible:block">
        <span className="block truncate text-xs font-black">{hotspot.product.name}</span>
        <span className="mt-1 block text-xs font-black text-violet-200">{money(hotspot.product.selling_price, settings.currency)}</span>
      </span>
    </button>
  );
}

function ProductDetailModal({ product, category, settings, onClose, onAddToCart }: { product: Product; category: string; settings: Settings; onClose: () => void; onAddToCart: (product: Product) => void }) {
  const [quantity, setQuantity] = useState(1);
  const addQuantity = useCallback(() => {
    for (let index = 0; index < quantity; index += 1) onAddToCart(product);
    onClose();
  }, [onAddToCart, onClose, product, quantity]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/72 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]">
        <div className="relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-64 w-full object-cover" />
          ) : (
            <div className="grid h-56 place-items-center bg-gradient-to-br from-violet-50 via-white to-amber-50 text-violet-700">
              <ShoppingBag className="h-14 w-14" />
            </div>
          )}
          <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-slate-800 shadow-lg" aria-label="Close product details"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">{category}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{product.name}</h3>
            <p className="mt-2 text-2xl font-black text-violet-700">{money(product.selling_price, settings.currency)}</p>
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
            <Button type="button" variant="primary" onClick={addQuantity} className="rounded-full bg-violet-600 text-white hover:bg-violet-500">Add to cart</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VirtualStoreExperience({ products, categories, settings, onAddToCart, onExit, onViewCart }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sceneMode, setSceneMode] = useState<"checking" | "webgl-ready" | "image-fallback">("checking");
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const hotspots = useMemo(() => productHotspots(visibleProducts), [visibleProducts]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  useEffect(() => {
    setSceneMode(supportsWebGL() ? "webgl-ready" : "image-fallback");
  }, []);

  return (
    <section
      data-render-mode={sceneMode}
      className="relative grid gap-3 overflow-hidden rounded-[32px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:p-4"
    >
      <StoreSceneImage settings={settings} productCount={visibleProducts.length} onExit={onExit} onViewCart={onViewCart || onExit}>
        <ProductHotspotLayer hotspots={hotspots} settings={settings} onSelect={setSelectedProduct} />
      </StoreSceneImage>
      <MobileCartDrawer onExit={onExit} onViewCart={onViewCart || onExit} />
      {!hotspots.length ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-slate-600">
          No products are available in this virtual store yet.
        </p>
      ) : null}
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

export default function VirtualStore3D(props: Props) {
  return <VirtualStoreExperience {...props} />;
}
