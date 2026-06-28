"use client";

/* eslint-disable @next/next/no-img-element */

import { Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
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

type ProductVisual = "package" | "tray" | "stack";

type StoreTheme = {
  accent: string;
  gold: string;
  wall: string;
  panel: string;
  wood: string;
  floor: string;
};

type DisplayUnit = {
  id: string;
  product: Product;
  visual: ProductVisual;
  index: number;
};

const STORE_THEMES: Record<string, StoreTheme> = {
  caribbean: { accent: "#12D6DF", gold: "#F5C451", wall: "#271912", panel: "#0B1D2E", wood: "#8a5429", floor: "#eee8df" },
  "modern-retail": { accent: "#48F3F8", gold: "#F5C451", wall: "#111827", panel: "#172033", wood: "#6b4a31", floor: "#edf2f7" },
  cafe: { accent: "#14b8a6", gold: "#F5C451", wall: "#332016", panel: "#26140d", wood: "#8b5a35", floor: "#f2e8dc" },
  restaurant: { accent: "#12D6DF", gold: "#FFD978", wall: "#2b201c", panel: "#15110f", wood: "#7a4b32", floor: "#eee7df" },
  grocery: { accent: "#34d399", gold: "#F5C451", wall: "#183325", panel: "#0f2419", wood: "#5d6b37", floor: "#e5f3e8" },
  beauty: { accent: "#f0abfc", gold: "#F5C451", wall: "#352039", panel: "#211025", wood: "#6f3f76", floor: "#f7edf7" },
  clothing: { accent: "#60a5fa", gold: "#F5C451", wall: "#1d2a41", panel: "#101927", wood: "#38598a", floor: "#edf2fb" }
};

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
  if (name.includes("pink") || name.includes("strawberry") || name.includes("rose")) {
    return { fill: "#f43f8a", soft: "#ffe4f1", deep: "#9d174d" };
  }
  if (name.includes("chocolate") || name.includes("brownie") || name.includes("cocoa")) {
    return { fill: "#6b341f", soft: "#c08457", deep: "#25140f" };
  }
  return { fill: "#12D6DF", soft: "#dcfbff", deep: "#0f766e" };
}

function visualFor(product: Product, index: number): ProductVisual {
  const name = product.name.toLowerCase();
  if (name.includes("brownie") || name.includes("chocolate") || name.includes("cake")) return "tray";
  if (name.includes("pink") || name.includes("sweet") || name.includes("candy")) return "stack";
  return index % 3 === 0 ? "tray" : "package";
}

function makeDisplayUnits(products: Product[], count: number, offset = 0): DisplayUnit[] {
  if (!products.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const product = products[(index + offset) % products.length];
    return {
      id: `${product.id}-${offset}-${index}`,
      product,
      visual: visualFor(product, index),
      index
    };
  });
}

function StoreAtmosphere({ theme }: { theme: StoreTheme }) {
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.wall} 0%, #111827 52%, ${theme.floor} 52%, #f8fafc 100%)` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(18,214,223,0.26),transparent_28%),radial-gradient(circle_at_78%_10%,rgba(245,196,81,0.24),transparent_22%),linear-gradient(90deg,rgba(255,255,255,0.08),transparent_26%,transparent_74%,rgba(255,255,255,0.08))]" />
      <div className="absolute inset-x-6 bottom-10 h-20 rounded-[50%] bg-slate-950/20 blur-2xl" />
    </>
  );
}

function StoreLighting({ theme }: { theme: StoreTheme }) {
  return (
    <>
      <div className="absolute left-1/2 top-3 h-4 w-32 -translate-x-1/2 rounded-full bg-white shadow-[0_0_38px_rgba(255,244,219,0.9)]" />
      <div className="absolute left-[22%] top-5 h-3 w-20 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_26px_rgba(255,244,219,0.85)]" />
      <div className="absolute left-[78%] top-5 h-3 w-20 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_26px_rgba(255,244,219,0.85)]" />
      <div className="absolute inset-x-[12%] top-[51%] h-1 rounded-full shadow-[0_0_24px_rgba(18,214,223,0.8)]" style={{ backgroundColor: theme.accent }} />
    </>
  );
}

function StoreBackWall({ settings, theme }: { settings: Settings; theme: StoreTheme }) {
  const businessName = safeBusinessName(settings);
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 px-4 py-5 shadow-2xl sm:px-6 sm:py-7" style={{ backgroundColor: theme.panel }}>
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.07) 0 5px, transparent 5px 30px)" }} />
      <div className="absolute inset-x-8 top-0 h-1 rounded-full shadow-[0_0_20px_rgba(18,214,223,0.85)]" style={{ backgroundColor: theme.accent }} />
      <div className="relative mx-auto flex max-w-xl items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-slate-950/72 px-4 py-4 shadow-2xl">
        {settings.logo_url ? <img src={settings.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-2xl bg-white object-contain p-1 shadow-lg" /> : null}
        <div className="min-w-0">
          <p className="truncate text-2xl font-black tracking-tight text-white sm:text-4xl">{businessName}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>Premium virtual storefront</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ backgroundColor: theme.gold }} />
    </div>
  );
}

function PlantDecor({ side }: { side: "left" | "right" }) {
  return (
    <div className={`pointer-events-none absolute bottom-[34%] hidden h-24 w-16 sm:block ${side === "left" ? "left-3" : "right-3"}`}>
      <div className="absolute bottom-0 left-1/2 h-9 w-10 -translate-x-1/2 rounded-b-2xl rounded-t-md bg-slate-900 shadow-xl" />
      {[-36, -18, 0, 18, 36].map((rotate) => (
        <div key={rotate} className="absolute bottom-7 left-1/2 h-20 w-3 origin-bottom rounded-full bg-teal-700 shadow-md" style={{ transform: `translateX(-50%) rotate(${rotate}deg)` }} />
      ))}
    </div>
  );
}

function ShelfSlot({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-w-0 place-items-center">
      <span className="absolute inset-x-2 bottom-1 h-2 rounded-full bg-slate-950/25 blur-sm" />
      {children}
    </div>
  );
}

function ShelfProductPackage({
  unit,
  currency,
  onSelect,
  compact = false
}: {
  unit: DisplayUnit;
  currency: string;
  onSelect: (product: Product) => void;
  compact?: boolean;
}) {
  const tone = toneFor(unit.product);
  const size = compact ? "h-14 w-14" : "h-16 w-16";

  if (unit.visual === "tray") {
    return (
      <button type="button" onClick={() => onSelect(unit.product)} aria-label={`View ${unit.product.name}`} className="group grid justify-items-center gap-1 rounded-2xl p-1 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span className={`${compact ? "h-14 w-20" : "h-16 w-24"} relative rounded-2xl border border-white/35 p-1 shadow-xl`} style={{ backgroundColor: tone.deep }}>
          <span className="grid h-full grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, index) => <span key={index} className="rounded-md shadow-inner" style={{ backgroundColor: index % 2 ? tone.soft : tone.fill }} />)}
          </span>
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute -right-1 -top-2 h-8 w-8 rounded-lg border border-white bg-white object-cover shadow-md" /> : null}
        </span>
        <ProductPrice product={unit.product} currency={currency} />
      </button>
    );
  }

  if (unit.visual === "stack") {
    return (
      <button type="button" onClick={() => onSelect(unit.product)} aria-label={`View ${unit.product.name}`} className="group grid justify-items-center gap-1 rounded-2xl p-1 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span className={`${compact ? "h-14 w-20" : "h-16 w-24"} relative`}>
          {[0, 1, 2].map((layer) => (
            <span key={layer} className="absolute left-1/2 h-7 w-16 -translate-x-1/2 rounded-xl border border-white/40 shadow-lg" style={{ bottom: layer * 10, backgroundColor: layer % 2 ? tone.soft : tone.fill }} />
          ))}
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute right-0 top-0 h-8 w-8 rounded-lg border border-white bg-white object-cover shadow-md" /> : null}
        </span>
        <ProductPrice product={unit.product} currency={currency} />
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onSelect(unit.product)} aria-label={`View ${unit.product.name}`} className="group grid justify-items-center gap-1 rounded-2xl p-1 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300">
      <span className={`${size} relative overflow-hidden rounded-[18px] border border-white/45 shadow-xl`} style={{ background: `linear-gradient(145deg, ${tone.soft}, #fff 55%, ${tone.fill})` }}>
        {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute inset-x-2 top-2 h-8 rounded-lg object-cover shadow-sm" /> : null}
        <span className="absolute inset-x-2 bottom-5 h-2 rounded-full" style={{ backgroundColor: tone.deep }} />
        <span className="absolute bottom-2 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-white/70" />
      </span>
      <ProductPrice product={unit.product} currency={currency} />
    </button>
  );
}

function ProductPrice({ product, currency }: { product: Product; currency: string }) {
  return <span className="max-w-[86px] truncate rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">{money(product.selling_price, currency)}</span>;
}

function StoreShelfWall({
  title,
  units,
  currency,
  theme,
  onSelect
}: {
  title: string;
  units: DisplayUnit[];
  currency: string;
  theme: StoreTheme;
  onSelect: (product: Product) => void;
}) {
  return (
    <div className="rounded-[26px] border border-white/12 bg-slate-950/76 p-3 shadow-2xl backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">{title}</p>
        <span className="h-2 w-16 rounded-full shadow-[0_0_16px_rgba(18,214,223,0.75)]" style={{ backgroundColor: theme.accent }} />
      </div>
      <div className="grid gap-2">
        {[0, 1].map((row) => (
          <div key={row} className="relative grid grid-cols-4 gap-2 border-t border-white/10 pt-2">
            <div className="absolute inset-x-0 bottom-2 h-2 rounded-full" style={{ backgroundColor: theme.wood }} />
            {units.slice(row * 4, row * 4 + 4).map((unit) => (
              <ShelfSlot key={unit.id}>
                <ShelfProductPackage unit={unit} currency={currency} onSelect={onSelect} compact />
              </ShelfSlot>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductTrayStack({ unit, currency, onSelect }: { unit: DisplayUnit; currency: string; onSelect: (product: Product) => void }) {
  return <ShelfProductPackage unit={{ ...unit, visual: unit.visual === "package" ? "tray" : unit.visual }} currency={currency} onSelect={onSelect} />;
}

function ProductDisplayIsland({
  units,
  currency,
  theme,
  onSelect
}: {
  units: DisplayUnit[];
  currency: string;
  theme: StoreTheme;
  onSelect: (product: Product) => void;
}) {
  return (
    <div className="relative rounded-[30px] border border-white/55 bg-white/94 p-4 shadow-2xl">
      <div className="absolute -top-1 left-8 right-8 h-2 rounded-full shadow-[0_0_22px_rgba(18,214,223,0.8)]" style={{ backgroundColor: theme.accent }} />
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Center display</p>
          <p className="text-base font-black text-slate-950">Featured products</p>
        </div>
        <Sparkles className="h-5 w-5" style={{ color: theme.accent }} />
      </div>
      <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6">
        {units.map((unit) => (
          <ProductTrayStack key={unit.id} unit={unit} currency={currency} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function StoreControls({ onExit }: { onExit: () => void }) {
  return (
    <div className="hidden grid-cols-4 gap-2 rounded-[24px] border border-slate-200 bg-white/88 p-2 shadow-lg backdrop-blur-xl md:grid">
      {["Home", "Featured", "Aisles"].map((label) => (
        <span key={label} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700">{label}</span>
      ))}
      <button type="button" onClick={onExit} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-lg transition hover:bg-teal-700">Cart</button>
    </div>
  );
}

function MobileStoreControls({ onExit }: { onExit: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-[22px] border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur-xl md:hidden">
      {["Home", "Featured", "Aisles"].map((label) => (
        <span key={label} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-100 px-2 text-[10px] font-black text-slate-700">{label}</span>
      ))}
      <button type="button" onClick={onExit} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-2 text-[10px] font-black text-white">Cart</button>
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
  const leftUnits = useMemo(() => makeDisplayUnits(products, 8, 0), [products]);
  const rightUnits = useMemo(() => makeDisplayUnits(products, 8, 4), [products]);
  const islandUnits = useMemo(() => makeDisplayUnits(products, products.length < 3 ? 4 : 6, 8), [products]);

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-3 shadow-2xl sm:p-5">
      <StoreAtmosphere theme={theme} />
      <StoreLighting theme={theme} />
      <PlantDecor side="left" />
      <PlantDecor side="right" />
      <div className="relative grid gap-3 sm:gap-4">
        <StoreBackWall settings={settings} theme={theme} />
        <div className="grid gap-3 lg:grid-cols-2">
          <StoreShelfWall title="Left shelf" units={leftUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
          <StoreShelfWall title="Right shelf" units={rightUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
        </div>
        <ProductDisplayIsland units={islandUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
        {!products.length ? (
          <div className="rounded-[24px] border border-white/20 bg-white/94 p-5 text-center shadow-xl">
            <ShoppingBag className="mx-auto h-8 w-8 text-teal-700" />
            <p className="mt-3 text-lg font-black text-slate-950">No products added yet.</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">This store has not published products for the virtual storefront.</p>
          </div>
        ) : null}
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
            <p className="truncate text-xs font-bold text-slate-500">Premium virtual storefront</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:shrink-0">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">{visibleProducts.length} live products</span>
          <Button type="button" size="sm" onClick={onExit} className="min-w-max rounded-full border-slate-200 bg-white px-4 text-xs text-slate-800 hover:border-teal-300 hover:bg-teal-50">Shop Normally</Button>
        </div>
      </div>
      <PremiumStoreScene products={visibleProducts} settings={settings} onSelect={setSelectedProduct} />
      <StoreControls onExit={onExit} />
      <MobileStoreControls onExit={onExit} />
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-bold leading-5 text-slate-600">
        Tap a shelf package to view details. Checkout stays in the normal store flow.
      </p>
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
