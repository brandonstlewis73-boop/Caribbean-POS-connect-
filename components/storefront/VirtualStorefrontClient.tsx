"use client";

/* eslint-disable @next/next/no-img-element */

import { Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
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

type DisplayKind = "box" | "tray" | "bag";

type StoreTheme = {
  accent: string;
  warm: string;
  wall: string;
  wood: string;
  dark: string;
};

type DisplayUnit = {
  id: string;
  product: Product;
  kind: DisplayKind;
  index: number;
};

const STORE_THEMES: Record<string, StoreTheme> = {
  caribbean: { accent: "#12D6DF", warm: "#F5C451", wall: "#2a1b15", wood: "#8a5429", dark: "#071421" },
  "modern-retail": { accent: "#48F3F8", warm: "#F5C451", wall: "#111827", wood: "#6b4a31", dark: "#071421" },
  cafe: { accent: "#14b8a6", warm: "#F5C451", wall: "#332016", wood: "#8b5a35", dark: "#1c120d" },
  restaurant: { accent: "#12D6DF", warm: "#FFD978", wall: "#2b201c", wood: "#7a4b32", dark: "#111827" },
  grocery: { accent: "#34d399", warm: "#F5C451", wall: "#183325", wood: "#5d6b37", dark: "#071421" },
  beauty: { accent: "#f0abfc", warm: "#F5C451", wall: "#352039", wood: "#6f3f76", dark: "#160f1c" },
  clothing: { accent: "#60a5fa", warm: "#F5C451", wall: "#1d2a41", wood: "#38598a", dark: "#071421" }
};

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function themeFor(settings: Settings): StoreTheme {
  const key = String(settings.storefront_3d_theme || settings.business_type || "caribbean").toLowerCase();
  const base = STORE_THEMES[key] || STORE_THEMES.caribbean;
  const color = settings.business_color && /^#?[0-9a-f]{6}$/i.test(settings.business_color)
    ? settings.business_color.startsWith("#") ? settings.business_color : `#${settings.business_color}`
    : base.accent;
  return { ...base, accent: color };
}

function productTone(product: Product) {
  const name = product.name.toLowerCase();
  if (name.includes("pink") || name.includes("strawberry") || name.includes("rose")) {
    return { fill: "#f9a8d4", face: "#fff1f7", edge: "#be185d", text: "#9d174d" };
  }
  if (name.includes("chocolate") || name.includes("brownie") || name.includes("cocoa")) {
    return { fill: "#5b2d1c", face: "#a1623f", edge: "#2b160f", text: "#3b1b10" };
  }
  return { fill: "#12D6DF", face: "#e6fbfd", edge: "#0f766e", text: "#0f766e" };
}

function displayUnits(products: Product[], count: number, offset = 0): DisplayUnit[] {
  if (!products.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const product = products[(index + offset) % products.length];
    const name = product.name.toLowerCase();
    const kind: DisplayKind = name.includes("brownie") || name.includes("chocolate")
      ? "tray"
      : name.includes("drink") || name.includes("juice") || name.includes("coffee")
        ? "bag"
        : "box";
    return { id: `${product.id}-${offset}-${index}`, product, kind, index };
  });
}

function ProductPackage({
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
  const tone = productTone(unit.product);

  if (unit.kind === "tray") {
    return (
      <button
        type="button"
        onClick={() => onSelect(unit.product)}
        className="group grid min-w-0 justify-items-center gap-1 rounded-2xl p-1 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300"
        aria-label={`View ${unit.product.name}`}
      >
        <span className={`${compact ? "h-14 w-20" : "h-16 w-24"} relative rounded-2xl border border-white/30 p-1 shadow-xl`} style={{ backgroundColor: tone.edge }}>
          <span className="grid h-full grid-cols-3 gap-1">
            {Array.from({ length: 6 }).map((_, piece) => (
              <span key={piece} className="rounded-lg shadow-inner" style={{ backgroundColor: piece % 2 ? tone.face : tone.fill }} />
            ))}
          </span>
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute -right-1 -top-2 h-8 w-8 rounded-lg border border-white bg-white object-cover shadow-md" /> : null}
        </span>
        <PackageCaption product={unit.product} currency={currency} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(unit.product)}
      className="group grid min-w-0 justify-items-center gap-1 rounded-2xl p-1 outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300"
      aria-label={`View ${unit.product.name}`}
    >
      <span
        className={`${compact ? "h-16 w-14" : "h-20 w-16"} relative overflow-hidden rounded-[18px] border border-white/45 shadow-xl`}
        style={{ background: `linear-gradient(145deg, ${tone.face}, #fff 55%, ${tone.fill})` }}
      >
        {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute inset-x-2 top-2 h-9 rounded-lg object-cover shadow-sm" /> : null}
        <span className="absolute inset-x-2 bottom-5 h-2 rounded-full" style={{ backgroundColor: tone.edge }} />
        <span className="absolute bottom-2 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-white/70" />
      </span>
      <PackageCaption product={unit.product} currency={currency} />
    </button>
  );
}

function PackageCaption({ product, currency }: { product: Product; currency: string }) {
  return (
    <span className="max-w-[88px] truncate rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm">
      {money(product.selling_price, currency)}
    </span>
  );
}

function StoreBackWall({ settings, theme }: { settings: Settings; theme: StoreTheme }) {
  const businessName = safeBusinessName(settings);
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 px-4 py-5 text-center shadow-2xl sm:px-6 sm:py-7" style={{ backgroundColor: theme.wall }}>
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.055) 0 6px, transparent 6px 34px)" }} />
      <div className="absolute inset-x-10 top-0 h-1 rounded-full shadow-[0_0_22px_rgba(18,214,223,0.8)]" style={{ backgroundColor: theme.accent }} />
      <div className="relative mx-auto flex max-w-xl items-center justify-center gap-3 rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-4 shadow-2xl">
        {settings.logo_url ? <img src={settings.logo_url} alt="" className="h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow-lg" /> : null}
        <div className="min-w-0 text-left">
          <p className="truncate text-2xl font-black tracking-tight text-white sm:text-4xl">{businessName}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.18em]" style={{ color: theme.accent }}>Virtual storefront</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ backgroundColor: theme.warm }} />
    </div>
  );
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
    <div className="rounded-[26px] border border-white/12 bg-slate-950/78 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/75">{title}</p>
        <span className="h-2 w-16 rounded-full shadow-[0_0_16px_rgba(18,214,223,0.75)]" style={{ backgroundColor: theme.accent }} />
      </div>
      <div className="grid gap-2">
        {[0, 1].map((row) => (
          <div key={row} className="relative grid grid-cols-4 gap-2 border-t border-white/10 pt-2">
            <div className="absolute inset-x-0 bottom-2 h-2 rounded-full" style={{ backgroundColor: theme.wood }} />
            {units.slice(row * 4, row * 4 + 4).map((unit) => (
              <ProductPackage key={unit.id} unit={unit} currency={currency} onSelect={onSelect} compact />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
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
    <div className="rounded-[30px] border border-white/50 bg-white/94 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Center display</p>
          <p className="text-base font-black text-slate-950">Featured products</p>
        </div>
        <Sparkles className="h-5 w-5" style={{ color: theme.accent }} />
      </div>
      <div className="grid grid-cols-2 gap-3 min-[430px]:grid-cols-3 sm:grid-cols-4">
        {units.map((unit) => (
          <ProductPackage key={unit.id} unit={{ ...unit, kind: unit.kind === "box" ? "tray" : unit.kind }} currency={currency} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function StoreControls({ onExit }: { onExit: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
        Home
      </span>
      <span className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-black text-cyan-800">
        Featured
      </span>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-lg transition hover:bg-teal-700"
      >
        Cart
      </button>
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
  const leftUnits = useMemo(() => displayUnits(products, 8, 0), [products]);
  const rightUnits = useMemo(() => displayUnits(products, 8, 4), [products]);
  const featuredUnits = useMemo(() => displayUnits(products, products.length < 3 ? 4 : 6, 9), [products]);

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-3 shadow-2xl sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(18,214,223,0.22),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(245,196,81,0.2),transparent_24%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(229,231,235,0.94))]" />
      <div className="relative grid gap-3 sm:gap-4">
        <StoreBackWall settings={settings} theme={theme} />
        <div className="grid gap-3 lg:grid-cols-2">
          <StoreShelfWall title="Left shelf" units={leftUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
          <StoreShelfWall title="Right shelf" units={rightUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
        </div>
        <ProductDisplayIsland units={featuredUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
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
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-bold leading-5 text-slate-600">
        Tap a package to view details. Checkout stays in the normal store flow.
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
