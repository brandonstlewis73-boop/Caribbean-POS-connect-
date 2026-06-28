"use client";

/* eslint-disable @next/next/no-img-element */

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
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

type HotspotZone = "heroShelfLeft" | "heroShelfRight" | "centerDisplay" | "counterDisplay";

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
  { zone: "heroShelfLeft", x: 25, y: 44, size: "md" },
  { zone: "centerDisplay", x: 48, y: 55, size: "lg" },
  { zone: "centerDisplay", x: 58, y: 58, size: "md" },
  { zone: "heroShelfRight", x: 73, y: 42, size: "md" },
  { zone: "heroShelfRight", x: 83, y: 52, size: "sm" },
  { zone: "counterDisplay", x: 38, y: 72, size: "sm" }
];

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function productHotspots(products: Product[]): ProductHotspotData[] {
  return products.slice(0, HOTSPOT_POSITIONS.length).map((product, index) => ({
    ...HOTSPOT_POSITIONS[index],
    id: `${product.id}-scene-hotspot-${index}`,
    product
  }));
}

function CartPanel({ onOpenCart }: { onOpenCart: () => void }) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-slate-950/72 p-1.5 shadow-2xl backdrop-blur-xl sm:flex">
      <Button type="button" size="sm" onClick={onOpenCart} className="rounded-full border-white/10 bg-white/10 px-4 text-xs text-white hover:bg-white/20">
        Shop Normally
      </Button>
      <Button type="button" size="sm" variant="primary" onClick={onOpenCart} className="rounded-full bg-violet-600 px-4 text-xs text-white hover:bg-violet-500">
        View Cart <ShoppingBag className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MobileCartDrawer({ onOpenCart }: { onOpenCart: () => void }) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-[24px] border border-white/20 bg-slate-950/86 p-2 shadow-2xl backdrop-blur-xl sm:hidden">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="sm" onClick={onOpenCart} className="rounded-2xl border-white/10 bg-white/10 text-xs text-white hover:bg-white/20">
          Shop Normally
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={onOpenCart} className="rounded-2xl bg-violet-600 text-xs text-white hover:bg-violet-500">
          View Cart
        </Button>
      </div>
    </div>
  );
}

function StoreSceneImage({ settings, onOpenCart, children }: { settings: Settings; onOpenCart: () => void; children: ReactNode }) {
  const businessName = safeBusinessName(settings);

  return (
    <div className="relative aspect-[16/10] min-h-[420px] overflow-hidden rounded-[30px] bg-slate-950 shadow-2xl sm:aspect-[16/9] md:min-h-[620px]">
      <img
        src={STORE_SCENE_IMAGE}
        alt={`${businessName} virtual storefront`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-transparent to-slate-950/28" />
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-3 rounded-full border border-white/15 bg-slate-950/62 px-3 py-2 text-white shadow-2xl backdrop-blur-xl">
          <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black sm:text-base">{businessName}</p>
            <p className="text-xs font-bold text-white/65">Virtual Store</p>
          </div>
        </div>
        <CartPanel onOpenCart={onOpenCart} />
      </div>
      {children}
      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-[24px] border border-white/15 bg-slate-950/62 px-4 py-3 text-center text-xs font-bold text-white/80 shadow-2xl backdrop-blur-xl sm:block">
        Tap product markers to view details
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
  const sizeClass = hotspot.size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20" : hotspot.size === "md" ? "h-12 w-12 sm:h-16 sm:w-16" : "h-11 w-11 sm:h-12 sm:w-12";

  return (
    <button
      type="button"
      onClick={() => onSelect(hotspot.product)}
      className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none"
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      aria-label={`View ${hotspot.product.name}`}
    >
      <span className="absolute -inset-3 rounded-full bg-violet-500/35 blur-xl transition group-hover:bg-violet-400/60 group-focus-visible:bg-violet-400/60" />
      <span className={`${sizeClass} relative grid place-items-center overflow-hidden rounded-full border border-white/70 bg-violet-600 shadow-2xl shadow-violet-950/40 transition group-hover:scale-105 group-focus-visible:scale-105`}>
        {hotspot.product.image_url ? (
          <img src={hotspot.product.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="h-5 w-5 text-white" />
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

function VirtualStoreExperience({ products, categories, settings, onAddToCart, onExit }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false), [products]);
  const hotspots = useMemo(() => productHotspots(visibleProducts), [visibleProducts]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  return (
    <section className="relative grid gap-3 overflow-hidden rounded-[32px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:p-4">
      <StoreSceneImage settings={settings} onOpenCart={onExit}>
        <ProductHotspotLayer hotspots={hotspots} settings={settings} onSelect={setSelectedProduct} />
      </StoreSceneImage>
      <MobileCartDrawer onOpenCart={onExit} />
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
