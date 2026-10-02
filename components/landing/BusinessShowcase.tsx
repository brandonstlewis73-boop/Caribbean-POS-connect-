"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, Package, ReceiptText, ShoppingBag, Search, SlidersHorizontal, LayoutDashboard, BarChart3, CircleAlert, Wifi, BatteryFull, Signal } from "lucide-react";

const segments = [
  {
    id: "owners", label: "Small businesses", color: "teal", icon: ShoppingBag,
    title: "Your counter. Your catalog. Connected.",
    description: "Keep counter sales and online orders in one place, with products and receipts ready when you need them.",
    features: ["Ring up a sale from your phone", "Share your online storefront", "Find customer orders and receipts"],
    screen: "Online storefront", rows: ["Browse the catalog", "Choose pickup or delivery", "Review your order"],
    caption: "From browsing to checkout", action: "Start selling"
  },
  {
    id: "teams", label: "Wholesalers & teams", color: "blue", icon: Package,
    title: "Keep the whole team on the same page.",
    description: "Look up products, check available stock, and follow orders from one workspace at the counter or on the road.",
    features: ["Search products by name or SKU", "Spot low-stock items", "Manage staff access and deliveries"],
    screen: "Inventory", rows: ["Coconut water - 48 in stock", "Coffee beans - 24 in stock", "Takeaway cups - low stock"],
    caption: "Know what is on your shelves", action: "Organize your business"
  },
  {
    id: "home", label: "Home entrepreneurs", color: "rose", icon: ReceiptText,
    title: "A small start. A professional experience.",
    description: "Give your products an online home and keep customer details, order history, and branded receipts together.",
    features: ["Create your product catalog", "Offer pickup and delivery", "Keep a receipt for every order"],
    screen: "Order receipt", rows: ["Order #1042", "Pickup - customer collection", "Total - US$25.00"],
    caption: "Every order, beautifully organized", action: "Launch your storefront"
  }
] as const;

export function PhonePreview({ variant = 0 }: { variant?: number }) {
  const segment = segments[variant] || segments[0];
  const Icon = segment.icon;
  if (segment.id === "teams") return <InventoryPreview />;
  return (
    <figure className={`product-phone phone-${segment.color}`} aria-label={`${segment.screen} example preview`}>
      <div className="product-phone-speaker" />
      <div className="product-phone-top"><Image src="/caribbean-pos-connect-icon.png" alt="" width={26} height={26} /><span>Caribbean POS Connect</span></div>
      <div className="product-phone-cover">
        <Image src="/storefront/premium-bakery-virtual-store.png" alt="Rendered bakery storefront" fill sizes="260px" className="object-cover" />
        <span><Icon size={18} />{segment.screen}</span>
      </div>
      <div className="product-phone-rows">
        {segment.rows.map((row) => <div key={row}><Check size={15} /><span>{row}</span></div>)}
      </div>
      <figcaption>{segment.caption}</figcaption>
    </figure>
  );
}

const inventoryPreviewProducts = [
  { name: "Orange juice", detail: "500 ml · JU-001", image: "juice.jpg", price: "TT$18.00", stock: 48 },
  { name: "Coffee beans", detail: "250 g · CF-002", image: "coffee.jpg", price: "TT$60.00", stock: 24 },
  { name: "Fresh bread", detail: "Daily loaf · BR-003", image: "bread.jpg", price: "TT$12.00", stock: 4 }
];

function InventoryPreview() {
  return (
    <figure className="product-phone inventory-preview" aria-label="Example inventory screen with sample products and stock levels">
      <div className="inventory-status-bar" aria-hidden="true"><span>9:41</span><div className="inventory-camera" /><span><Signal size={12} /><Wifi size={12} /><BatteryFull size={17} /></span></div>
      <div className="inventory-app-header"><Image src="/caribbean-pos-connect-icon.png" alt="" width={26} height={26} /><div><strong>Caribbean POS Connect</strong><span>Port of Spain · Main store</span></div><span className="inventory-avatar">AL</span></div>
      <div className="inventory-screen-heading"><div><h3>Inventory</h3><p>Your products at a glance</p></div><span className="inventory-demo-label">Sample</span></div>
      <div className="inventory-summary"><div><span>Products</span><strong>128</strong></div><div><span>In stock</span><strong>124</strong></div><div className="inventory-summary-alert"><span>Low stock</span><strong>4</strong></div></div>
      <div className="inventory-search"><Search size={13} /><span>Search name or SKU</span><SlidersHorizontal size={13} /></div>
      <div className="inventory-list-heading"><strong>Products</strong><span>Showing 3 of 128</span></div>
      <div className="inventory-product-list">
        {inventoryPreviewProducts.map((product) => <div className="inventory-product-row" key={product.name}>
          <Image src={`/marketing/${product.image}`} alt={product.name} width={44} height={44} />
          <div className="inventory-product-info"><strong>{product.name}</strong><span>{product.detail}</span><b>{product.price}</b></div>
          <div className={`inventory-stock ${product.stock < 5 ? "is-low" : ""}`}><strong>{product.stock}</strong><span>{product.stock < 5 ? "Low stock" : "In stock"}</span></div>
        </div>)}
      </div>
      <div className="inventory-reorder-note"><CircleAlert size={14} /><span><strong>Fresh bread is running low</strong><br />Reorder before the next busy day.</span></div>
      <div className="inventory-bottom-nav" aria-label="Example app navigation"><span><LayoutDashboard size={16} />Home</span><span><ShoppingBag size={16} />Sell</span><span className="is-active"><Package size={16} />Inventory</span><span><BarChart3 size={16} />Reports</span></div>
      <figcaption>Example inventory · Sample data</figcaption>
      <div className="inventory-home-indicator" aria-hidden="true" />
    </figure>
  );
}

export function BusinessShowcase() {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const segment = segments[selected];
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % segments.length;
    else if (event.key === "ArrowLeft") next = (index + segments.length - 1) % segments.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = segments.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    tabRefs.current[next]?.focus();
  }
  return (
    <section id="solutions" className="business-showcase">
      <div className="business-showcase-inner">
        <div id="segments" className="business-tabs" role="tablist" aria-label="Business type">
          {segments.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.id} id={`tab-${item.id}`} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" aria-selected={selected === index} aria-controls={`panel-${item.id}`} tabIndex={selected === index ? 0 : -1} onKeyDown={(event) => moveTab(event, index)} onClick={() => setSelected(index)}><Icon size={18} />{item.label}</button>;
          })}
        </div>
        <div key={segment.id} id={`panel-${segment.id}`} className={`business-tab-panel accent-${segment.color}`} role="tabpanel" aria-labelledby={`tab-${segment.id}`} tabIndex={0}>
          <div className="business-tab-copy">
            <p className="business-eyebrow">Built around your business</p>
            <h2>{segment.title}</h2>
            <p>{segment.description}</p>
            <ul>{segment.features.map((feature) => <li key={feature}><Check size={18} />{feature}</li>)}</ul>
            <Link href="/signup">{segment.action}<ArrowRight size={18} /></Link>
          </div>
          <div className="business-device-stage">
            <Image src="/marketing/tablet.jpg" alt="Real iPad tablet and Apple Pencil on a desk" width={1200} height={854} sizes="(max-width: 767px) 92vw, 420px" className="business-tablet-photo" />
            <PhonePreview variant={selected} />
          </div>
        </div>
      </div>
    </section>
  );
}
