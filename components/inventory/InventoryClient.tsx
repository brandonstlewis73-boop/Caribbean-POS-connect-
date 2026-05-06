"use client";

import { useMemo, useState } from "react";
import { PackagePlus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money, PRODUCT_CATEGORIES } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Product } from "@/lib/types";

const emptyProduct = {
  name: "",
  sku: "",
  barcode: "",
  category: "Food",
  cost_price: 0,
  selling_price: 0,
  stock_quantity: 0,
  low_stock_alert: 5,
  image_url: "",
  supplier_name: "",
  supplier_phone: ""
};

export function InventoryClient({ products }: { products: Product[] }) {
  const [items, setItems] = useState(products);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(emptyProduct);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((product) =>
      !q || [product.name, product.sku, product.barcode, product.category, product.supplier_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  async function createProduct() {
    setMessage("");
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const payload = await readApiPayload<{ product: Product }>(response);
    if (response.ok) {
      const product = payload.data?.product;
      if (!product) return setMessage("Product saved, but no product details were returned.");
      setItems((current) => [product, ...current]);
      setDraft(emptyProduct);
      setMessage("Product saved.");
    } else {
      setMessage(payload.error || "Product could not be saved.");
    }
  }

  async function adjust(productId: string) {
    const delta = Number(adjustments[productId] || 0);
    if (!delta) return;
    const response = await fetch(`/api/inventory/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adjustment_delta: delta, reason: "Inventory screen adjustment" })
    });
    const payload = await readApiPayload<{ product: Product }>(response);
    if (response.ok) {
      const updated = payload.data?.product;
      if (!updated) return;
      setItems((current) =>
        current.map((product) => (product.id === productId ? updated : product))
      );
      setAdjustments((current) => ({ ...current, [productId]: 0 }));
    }
  }

  async function archive(productId: string) {
    const response = await fetch(`/api/inventory/${productId}`, { method: "DELETE" });
    const payload = await readApiPayload<{ product: Product }>(response);
    if (response.ok) {
      const updated = payload.data?.product;
      if (!updated) return;
      setItems((current) =>
        current.map((product) => (product.id === productId ? updated : product))
      );
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">
      <Panel>
        <PanelHeader title="Inventory" description="Products, categories, stock, suppliers, and low-stock alerts" />
        <div className="border-b border-caribbean-line p-4 dark:border-slate-800">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, barcode, category, supplier"
              className="h-10 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-caribbean-cloud text-xs uppercase tracking-normal text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Adjust</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-caribbean-line dark:divide-slate-800">
              {filtered.map((product) => (
                <tr key={product.id} className={product.active ? "" : "opacity-45"}>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} loading="lazy" className="h-12 w-12 shrink-0 rounded-card object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card bg-caribbean-cloud text-xs font-black text-caribbean-teal dark:bg-slate-950">
                          {product.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-black">{product.name}</p>
                        <p className="text-xs font-semibold text-slate-500">{product.sku} - {product.barcode || "No barcode"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{money(product.cost_price)}</td>
                  <td className="px-4 py-3 font-black">{money(product.selling_price)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={product.stock_quantity <= product.low_stock_alert ? "red" : "green"}>
                      {product.stock_quantity} / alert {product.low_stock_alert}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{product.supplier_name || "None"}</p>
                    <p className="text-xs font-semibold text-slate-500">{product.supplier_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="number"
                        value={adjustments[product.id] || 0}
                        onChange={(event) => setAdjustments((current) => ({ ...current, [product.id]: Number(event.target.value) }))}
                        className="h-9 w-20 rounded-card border border-caribbean-line px-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
                      />
                      <Button size="sm" onClick={() => adjust(product.id)}>
                        <SlidersHorizontal className="h-4 w-4" />
                        Apply
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" onClick={() => archive(product.id)} aria-label={`Archive ${product.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title="Add product" description="Create products with stock tracking and supplier info" />
        <div className="grid gap-3 p-4">
          <Field label="Product name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU" value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
            <Field label="Barcode" value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
          </div>
          <SelectField label="Category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {PRODUCT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </SelectField>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cost price" type="number" value={draft.cost_price} onChange={(event) => setDraft({ ...draft, cost_price: Number(event.target.value) })} />
            <Field label="Selling price" type="number" value={draft.selling_price} onChange={(event) => setDraft({ ...draft, selling_price: Number(event.target.value) })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stock quantity" type="number" value={draft.stock_quantity} onChange={(event) => setDraft({ ...draft, stock_quantity: Number(event.target.value) })} />
            <Field label="Low stock alert" type="number" value={draft.low_stock_alert} onChange={(event) => setDraft({ ...draft, low_stock_alert: Number(event.target.value) })} />
          </div>
          <Field label="Product image URL" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} />
          <Field label="Supplier" value={draft.supplier_name} onChange={(event) => setDraft({ ...draft, supplier_name: event.target.value })} />
          <Field label="Supplier phone" value={draft.supplier_phone} onChange={(event) => setDraft({ ...draft, supplier_phone: event.target.value })} />
          {message ? <p className="rounded-card bg-caribbean-cloud p-3 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{message}</p> : null}
          <Button variant="primary" onClick={createProduct}>
            <PackagePlus className="h-4 w-4" />
            Save product
          </Button>
        </div>
      </Panel>
    </div>
  );
}
