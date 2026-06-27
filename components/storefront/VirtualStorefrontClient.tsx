"use client";

/* eslint-disable @next/next/no-img-element */

import { Home, Minus, PackageOpen, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
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

type Viewpoint = "home" | "featured" | "aisles" | "cart";
type DisplayKind = "package" | "tray";

type StoreTheme = {
  accent: string;
  warm: string;
  wood: string;
  darkWood: string;
  wall: string;
  shelf: string;
  counter: string;
};

type DisplayUnit = {
  id: string;
  product: Product;
  kind: DisplayKind;
  index: number;
};

const STORE_THEMES: Record<string, StoreTheme> = {
  caribbean: { accent: "#12D6DF", warm: "#F5C451", wood: "#8a5429", darkWood: "#231713", wall: "#2a1b15", shelf: "#102c38", counter: "#0f3143" },
  "modern-retail": { accent: "#48F3F8", warm: "#F5C451", wood: "#6b4a31", darkWood: "#151923", wall: "#111827", shelf: "#243244", counter: "#0f172a" },
  cafe: { accent: "#14b8a6", warm: "#F5C451", wood: "#8b5a35", darkWood: "#2c1c14", wall: "#332016", shelf: "#6f4127", counter: "#51301f" },
  restaurant: { accent: "#12D6DF", warm: "#FFD978", wood: "#7a4b32", darkWood: "#221815", wall: "#2b201c", shelf: "#523429", counter: "#2b201c" },
  grocery: { accent: "#34d399", warm: "#F5C451", wood: "#5d6b37", darkWood: "#14231a", wall: "#183325", shelf: "#25634a", counter: "#174734" },
  beauty: { accent: "#f0abfc", warm: "#F5C451", wood: "#6f3f76", darkWood: "#241329", wall: "#352039", shelf: "#6f3f76", counter: "#4b2d50" },
  clothing: { accent: "#60a5fa", warm: "#F5C451", wood: "#38598a", darkWood: "#121b2b", wall: "#1d2a41", shelf: "#2f4c7d", counter: "#1d3357" }
};

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function themeFor(settings: Settings): StoreTheme {
  const selected = String(settings.storefront_3d_theme || settings.business_type || "caribbean").toLowerCase();
  const base = STORE_THEMES[selected] || STORE_THEMES.caribbean;
  const brand = settings.business_color && /^#?[0-9a-f]{6}$/i.test(settings.business_color)
    ? settings.business_color.startsWith("#") ? settings.business_color : `#${settings.business_color}`
    : base.accent;
  return { ...base, accent: brand };
}

function productTone(product: Product) {
  const name = product.name.toLowerCase();
  if (name.includes("pink") || name.includes("strawberry") || name.includes("rose")) {
    return { primary: "#f43f8a", secondary: "#fbcfe8", dark: "#831843", text: "#831843" };
  }
  if (name.includes("chocolate") || name.includes("brownie") || name.includes("cocoa")) {
    return { primary: "#4a2517", secondary: "#9a5b35", dark: "#24130f", text: "#3b1b10" };
  }
  return { primary: "#12D6DF", secondary: "#dffbff", dark: "#071421", text: "#0f766e" };
}

function repeatedUnits(products: Product[], count: number, offset = 0): DisplayUnit[] {
  if (!products.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const product = products[(index + offset) % products.length];
    const name = product.name.toLowerCase();
    const kind: DisplayKind = name.includes("brownie") || name.includes("chocolate") || index % 3 === 0 ? "tray" : "package";
    return { id: `${product.id}-${offset}-${index}`, product, kind, index };
  });
}

function CategoryLabel({ category }: { category?: Category }) {
  if (!category) return null;
  return (
    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/75">
      {category.name}
    </span>
  );
}

function StoreAtmosphere({ theme }: { theme: StoreTheme }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(18,214,223,0.24),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(245,196,81,0.22),transparent_24%),linear-gradient(180deg,#0b1217_0%,#172119_58%,#f5efe6_58%,#f8fafc_100%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/12 to-transparent" />
      <div className="absolute inset-x-8 bottom-12 h-32 rounded-[50%] bg-slate-950/25 blur-2xl" />
      <div className="absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl" style={{ backgroundColor: `${theme.warm}44` }} />
    </>
  );
}

function StoreLighting({ theme }: { theme: StoreTheme }) {
  return (
    <>
      {[22, 50, 78].map((left) => (
        <div key={left} className="absolute top-5 h-4 w-16 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_34px_rgba(255,239,210,0.85)]" style={{ left: `${left}%` }} />
      ))}
      <div className="absolute left-[18%] top-24 h-72 w-32 rotate-12 bg-gradient-to-b from-white/18 to-transparent blur-xl" />
      <div className="absolute right-[18%] top-24 h-72 w-32 -rotate-12 bg-gradient-to-b from-white/14 to-transparent blur-xl" />
      <div className="absolute inset-x-10 top-[52%] h-1 rounded-full shadow-[0_0_24px_rgba(18,214,223,0.75)]" style={{ backgroundColor: theme.accent }} />
    </>
  );
}

function StoreBackWall({ settings, theme }: { settings: Settings; theme: StoreTheme }) {
  const businessName = safeBusinessName(settings);
  return (
    <div className="absolute inset-x-[9%] top-[10%] h-[42%] overflow-hidden rounded-t-[34px] border border-white/10 shadow-2xl" style={{ backgroundColor: theme.darkWood }}>
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.06) 0 6px, transparent 6px 54px)" }} />
      <div className="absolute inset-x-[18%] top-[20%] rounded-[26px] border border-white/10 bg-slate-950/72 px-5 py-5 text-center shadow-2xl">
        {settings.logo_url ? <img src={settings.logo_url} alt="" className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-white object-contain p-1 shadow-lg sm:h-14 sm:w-14" /> : null}
        <p className="truncate text-2xl font-black tracking-tight text-white sm:text-4xl">{businessName}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.2em]" style={{ color: theme.accent }}>Premium storefront</p>
      </div>
      <div className="absolute inset-x-[12%] bottom-[22%] h-1 rounded-full shadow-[0_0_24px_rgba(18,214,223,0.65)]" style={{ backgroundColor: theme.accent }} />
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: theme.warm }} />
    </div>
  );
}

function PlantDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute bottom-[26%] h-28 w-16 ${className}`}>
      <div className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-b-2xl rounded-t-md bg-slate-800 shadow-xl" />
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="absolute bottom-8 left-1/2 h-20 w-3 origin-bottom rounded-full bg-teal-700 shadow-md" style={{ transform: `translateX(-50%) rotate(${(item - 2) * 24}deg)` }} />
      ))}
    </div>
  );
}

function ShelfProductPackage({ unit, currency, theme, onSelect }: { unit: DisplayUnit; currency: string; theme: StoreTheme; onSelect: (product: Product) => void }) {
  const tone = productTone(unit.product);
  const isTray = unit.kind === "tray";
  return (
    <button
      type="button"
      onClick={() => onSelect(unit.product)}
      className="group relative grid min-h-[70px] place-items-center rounded-xl outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300"
      aria-label={`View ${unit.product.name}`}
    >
      <span className="absolute inset-x-1 bottom-0 h-3 rounded-full bg-slate-950/25 blur-md" />
      {isTray ? (
        <span className="relative grid h-[58px] w-[88px] place-items-center rounded-xl border border-white/25 p-1 shadow-xl" style={{ backgroundColor: tone.dark }}>
          <span className="grid grid-cols-3 gap-1">
            {[0, 1, 2, 3, 4, 5].map((piece) => (
              <span key={piece} className="h-4 w-5 rounded-md shadow-sm" style={{ backgroundColor: piece % 2 ? tone.secondary : tone.primary }} />
            ))}
          </span>
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute -top-3 right-1 h-8 w-8 rounded-lg border border-white/60 object-cover shadow-md" /> : null}
        </span>
      ) : (
        <span className="relative block h-[68px] w-[58px] rounded-xl border border-white/45 shadow-xl" style={{ background: `linear-gradient(160deg,${tone.secondary},#ffffff 55%,${tone.primary})` }}>
          {unit.product.image_url ? <img src={unit.product.image_url} alt="" className="absolute inset-x-2 top-2 h-8 rounded-lg object-cover shadow-sm" /> : null}
          <span className="absolute inset-x-2 bottom-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
        </span>
      )}
      <span className="mt-1 max-w-[96px] truncate rounded-full bg-white/92 px-2 py-1 text-[10px] font-black shadow-sm" style={{ color: tone.text }}>
        {money(unit.product.selling_price, currency)}
      </span>
    </button>
  );
}

function ShelfSlot({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 place-items-center">{children}</div>;
}

function StoreShelfWall({
  side,
  units,
  categories,
  currency,
  theme,
  onSelect
}: {
  side: "left" | "right";
  units: DisplayUnit[];
  categories: Category[];
  currency: string;
  theme: StoreTheme;
  onSelect: (product: Product) => void;
}) {
  return (
    <div className={`absolute top-[26%] hidden h-[42%] w-[22%] rounded-[26px] border border-white/12 bg-slate-950/72 p-3 shadow-2xl md:block ${side === "left" ? "left-[5%]" : "right-[5%]"}`}>
      <div className="mb-2 flex items-center justify-between">
        <CategoryLabel category={categories[side === "left" ? 0 : 1]} />
        <span className="h-2 w-16 rounded-full shadow-[0_0_16px_rgba(18,214,223,0.85)]" style={{ backgroundColor: theme.accent }} />
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="relative grid grid-cols-3 gap-2 border-t border-white/10 py-2">
          <div className="absolute inset-x-0 bottom-1 h-1 rounded-full" style={{ backgroundColor: theme.wood }} />
          {units.slice(row * 3, row * 3 + 3).map((unit) => (
            <ShelfSlot key={unit.id}>
              <ShelfProductPackage unit={unit} currency={currency} theme={theme} onSelect={onSelect} />
            </ShelfSlot>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProductTrayStack({ unit, currency, theme, onSelect }: { unit: DisplayUnit; currency: string; theme: StoreTheme; onSelect: (product: Product) => void }) {
  return <ShelfProductPackage unit={{ ...unit, kind: "tray" }} currency={currency} theme={theme} onSelect={onSelect} />;
}

function ProductDisplayIsland({ units, currency, theme, onSelect }: { units: DisplayUnit[]; currency: string; theme: StoreTheme; onSelect: (product: Product) => void }) {
  return (
    <div className="absolute inset-x-[8%] bottom-[22%] rounded-[32px] border border-white/25 bg-white/88 p-3 shadow-2xl backdrop-blur-md sm:inset-x-[14%] sm:p-4">
      <div className="absolute -top-2 left-8 right-8 h-2 rounded-full shadow-[0_0_20px_rgba(18,214,223,0.8)]" style={{ backgroundColor: theme.accent }} />
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Featured display</p>
          <p className="text-sm font-black text-slate-950">Tap packages for details</p>
        </div>
        <span className="hidden rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white sm:inline-flex">{units.length} displays</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {units.map((unit) => (
          <ProductTrayStack key={unit.id} unit={unit} currency={currency} theme={theme} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function StoreControls({ viewpoint, setViewpoint, onExit }: { viewpoint: Viewpoint; setViewpoint: (viewpoint: Viewpoint) => void; onExit: () => void }) {
  const items: Array<{ id: Viewpoint; label: string; icon: typeof Home; action?: () => void }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "featured", label: "Featured", icon: Sparkles },
    { id: "aisles", label: "Aisles", icon: PackageOpen },
    { id: "cart", label: "Cart", icon: ShoppingBag, action: onExit }
  ];
  return (
    <div className="absolute inset-x-3 bottom-3 z-20 hidden justify-center md:flex">
      <div className="flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/82 p-2 text-white shadow-2xl backdrop-blur-xl">
        {items.map(({ id, label, icon: Icon, action }) => (
          <button
            key={id}
            type="button"
            onClick={() => action ? action() : setViewpoint(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-black transition ${viewpoint === id ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileStoreControls({ viewpoint, setViewpoint, onExit }: { viewpoint: Viewpoint; setViewpoint: (viewpoint: Viewpoint) => void; onExit: () => void }) {
  const items: Array<{ id: Viewpoint; label: string; icon: typeof Home; action?: () => void }> = [
    { id: "home", label: "Home", icon: Home },
    { id: "featured", label: "Featured", icon: Sparkles },
    { id: "aisles", label: "Aisles", icon: PackageOpen },
    { id: "cart", label: "Cart", icon: ShoppingBag, action: onExit }
  ];
  return (
    <div className="absolute inset-x-2 bottom-2 z-20 md:hidden">
      <div className="grid grid-cols-4 gap-1 rounded-[20px] border border-white/35 bg-slate-950/86 p-1 text-white shadow-2xl backdrop-blur-xl">
        {items.map(({ id, label, icon: Icon, action }) => (
          <button
            key={id}
            type="button"
            onClick={() => action ? action() : setViewpoint(id)}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition ${viewpoint === id ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-white"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
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
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/64 p-3 backdrop-blur-sm sm:place-items-center">
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
  categories,
  settings,
  viewpoint,
  setViewpoint,
  onSelect,
  onExit
}: {
  products: Product[];
  categories: Category[];
  settings: Settings;
  viewpoint: Viewpoint;
  setViewpoint: (viewpoint: Viewpoint) => void;
  onSelect: (product: Product) => void;
  onExit: () => void;
}) {
  const theme = useMemo(() => themeFor(settings), [settings]);
  const leftUnits = useMemo(() => repeatedUnits(products, 9, 0), [products]);
  const rightUnits = useMemo(() => repeatedUnits(products, 9, 4), [products]);
  const islandUnits = useMemo(() => repeatedUnits(products, products.length < 3 ? 6 : 8, 9), [products]);

  return (
    <div className="relative h-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 shadow-2xl min-[430px]:h-[600px] md:h-[720px]">
      <StoreAtmosphere theme={theme} />
      <StoreLighting theme={theme} />
      <StoreBackWall settings={settings} theme={theme} />
      <StoreShelfWall side="left" units={leftUnits} categories={categories} currency={settings.currency} theme={theme} onSelect={onSelect} />
      <StoreShelfWall side="right" units={rightUnits} categories={categories} currency={settings.currency} theme={theme} onSelect={onSelect} />
      <PlantDecor className="left-[3%]" />
      <PlantDecor className="right-[3%]" />
      <div className="absolute inset-x-[16%] bottom-[17%] hidden h-[22%] rounded-[28px] border border-white/15 bg-slate-950/82 shadow-2xl md:block">
        <div className="absolute inset-x-8 top-4 h-1 rounded-full" style={{ backgroundColor: theme.accent }} />
        <div className="absolute left-8 top-8 h-16 w-24 rounded-2xl border border-white/20 bg-white/10 shadow-xl" />
        <div className="absolute right-8 top-7 h-20 w-28 rounded-2xl border border-white/20 bg-white/10 shadow-xl" />
      </div>
      <ProductDisplayIsland units={islandUnits} currency={settings.currency} theme={theme} onSelect={onSelect} />
      {!products.length ? (
        <div className="absolute inset-x-4 top-28 z-20 mx-auto max-w-md rounded-[26px] border border-slate-200 bg-white/94 p-5 text-center shadow-xl backdrop-blur-xl">
          <ShoppingBag className="mx-auto h-8 w-8 text-teal-700" />
          <p className="mt-3 text-lg font-black text-slate-950">No products added yet.</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">This store has not published products for the virtual storefront.</p>
        </div>
      ) : null}
      <StoreControls viewpoint={viewpoint} setViewpoint={setViewpoint} onExit={onExit} />
      <MobileStoreControls viewpoint={viewpoint} setViewpoint={setViewpoint} onExit={onExit} />
    </div>
  );
}

export default function VirtualStore3D({ products, categories, settings, onAddToCart, onExit }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewpoint, setViewpoint] = useState<Viewpoint>("home");
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false).slice(0, 24), [products]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const businessName = safeBusinessName(settings);

  return (
    <section className="grid gap-2 overflow-hidden rounded-[26px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10 sm:gap-3 sm:rounded-[34px] sm:p-4">
      <div className="grid gap-2 rounded-[22px] border border-slate-200 bg-white p-3 text-slate-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm sm:h-12 sm:w-12" />
          <div className="min-w-0">
            <p className="truncate text-base font-black sm:text-lg">{businessName}</p>
            <p className="truncate text-xs font-bold text-slate-500">Premium virtual storefront</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:shrink-0">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{visibleProducts.length} live products</span>
          <Button type="button" size="sm" onClick={onExit} className="min-w-max rounded-full border-slate-200 bg-white px-3 text-xs text-slate-800 hover:border-teal-300 hover:bg-teal-50 sm:px-4 sm:text-sm">Shop Normally</Button>
        </div>
      </div>
      <PremiumStoreScene products={visibleProducts} categories={categories} settings={settings} viewpoint={viewpoint} setViewpoint={setViewpoint} onSelect={setSelectedProduct} onExit={onExit} />
      <p className="mx-auto max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-bold leading-5 text-slate-600 sm:text-xs">Tap shelf packages for details. Cart and checkout stay in the normal store flow.</p>
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
