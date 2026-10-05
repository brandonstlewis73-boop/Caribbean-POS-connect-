"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Camera, Edit3, FolderOpen, Image as ImageIcon, PackagePlus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { MAX_PRODUCT_PHOTO_BYTES, optimizePhoto, validateSourcePhoto } from "@/lib/photo-upload";
import { readApiPayload } from "@/lib/client-response";
import type { Category, Product, ProductOption } from "@/lib/types";

const PRODUCT_IMAGE_ACCEPT = "image/*";
type UploadedImagePayload = { imageUrl: string; path: string };

function productImageExtension(file: File) {
  return (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function productImageType(file: File) { return file.type || "image/jpeg"; }

function safeProductImageName(file: File) {
  const extension = productImageExtension(file) || productImageType(file).split("/").pop() || "jpg";
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "product-photo";
  const safeExtension = extension === "jpeg" ? "jpg" : extension;
  return `${base}.${safeExtension}`;
}

function validateProductImage(file: File) { return validateSourcePhoto(file); }

function validateProductImageUrl(value?: string | null) {
  const imageUrl = (value || "").trim();
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (url.protocol === "http:" || url.protocol === "https:") return null;
  } catch {
    // Fall through to the friendly message below.
  }
  return "Enter a valid product image URL starting with http:// or https://.";
}

async function compressProductImage(file: File) {
  return optimizePhoto(file, { maxBytes: MAX_PRODUCT_PHOTO_BYTES, maxDimension: 1600 });
}

function uploadProductImageFile(file: File, productId: string, oldImageUrl: string, onProgress: (progress: number) => void) {
  return new Promise<UploadedImagePayload>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, safeProductImageName(file));
    form.append("productId", productId);
    if (oldImageUrl) form.append("oldImageUrl", oldImageUrl);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/inventory/images");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };
    request.onload = () => {
      let payload: { data?: UploadedImagePayload; error?: string } = {};
      try {
        payload = JSON.parse(request.responseText || "{}");
      } catch {
        payload = {};
      }
      if (request.status >= 200 && request.status < 300 && payload.data?.imageUrl) {
        onProgress(100);
        resolve(payload.data);
      } else {
        reject(new Error(request.status === 413 ? "The optimized photo is too large for upload. Choose a smaller photo." : payload.error || "Product photo could not be uploaded."));
      }
    };
    request.timeout = 120000;
    request.ontimeout = () => reject(new Error("Photo upload timed out. Check your connection and try again."));
    request.onerror = () => reject(new Error("Product photo upload failed. Check your connection and try again."));
    request.send(form);
  });
}

function optionText(options?: ProductOption[]) {
  return (options || []).map((option) => option.price_delta ? `${option.name}:${option.price_delta}` : option.name).join(", ");
}

function parseOptionText(value: string): ProductOption[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, price] = item.split(":").map((part) => part.trim());
      return { name, price_delta: Number(price || 0) };
    });
}

function emptyProduct(categories: Category[]) {
  return {
    name: "",
    sku: "",
    barcode: "",
    category_id: categories[0]?.id || "",
    category: categories[0]?.name || "Uncategorized",
    description: "",
    cost_price: 0,
    selling_price: 0,
    discount_price: "",
    stock_quantity: 0,
    low_stock_alert: 5,
    image_url: "",
    supplier_name: "",
    supplier_phone: "",
    variationsText: "",
    addOnsText: "",
    active: true
  };
}

function usefulProductError(payloadError?: string, details?: unknown) {
  if (payloadError) return payloadError;
  if (details && typeof details === "object") return "Check the product fields and try again.";
  return "Product could not be saved. Please check the details and try again.";
}

export function InventoryClient({ products, categories, currency }: { products: Product[]; categories: Category[]; currency: string }) {
  const [items, setItems] = useState(products);
  const [categoryItems, setCategoryItems] = useState(categories);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(emptyProduct(categories));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageMarkedForRemoval, setImageMarkedForRemoval] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const takePhotoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);
  const previewImageUrl = imagePreviewUrl || draft.image_url || "";

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  function setPreviewFile(file: File | null) {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setSelectedImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  function resetProductForm(nextCategories = categoryItems) {
    setEditingId("");
    setDraft(emptyProduct(nextCategories));
    setPreviewFile(null);
    setImageMarkedForRemoval(false);
    setUploadProgress(null);
    setUploadStatus("");
  }

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    return items.filter((product) => {
      const categoryMatch = categoryFilter === "all" || product.category_id === categoryFilter || product.category === categoryFilter;
      const queryMatch = !q || [product.name, product.sku, product.barcode, product.category, product.supplier_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
      return categoryMatch && queryMatch;
    });
  }, [items, deferredQuery, categoryFilter]);

  async function refreshProducts() {
    const response = await fetch("/api/inventory");
    const payload = await readApiPayload<{ products: Product[] }>(response);
    if (!response.ok) throw new Error(payload.error || "Product list could not be refreshed.");
    if (payload.data?.products) setItems(payload.data.products);
  }

  function selectCategory(categoryId: string) {
    const category = categoryItems.find((item) => item.id === categoryId);
    setDraft({ ...draft, category_id: categoryId, category: category?.name || draft.category });
  }

  async function createQuickCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryMessage("Enter a category name first.");
      return;
    }
    setSavingCategory(true);
    setCategoryMessage("");
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sort_order: categoryItems.length, is_active: true, active: true })
      });
      const payload = await readApiPayload<{ category: Category }>(response);
      if (!response.ok || !payload.data?.category) {
        setCategoryMessage(payload.error || "Category could not be added.");
        return;
      }
      const category = payload.data.category;
      setCategoryItems((current) => [...current, category].sort((a, b) => a.sort_order - b.sort_order));
      setDraft((current) => ({ ...current, category_id: category.id, category: category.name }));
      setNewCategoryName("");
      setCategoryMessage("Category added.");
    } catch {
      setCategoryMessage("Category could not be added. Check your connection and try again.");
    } finally {
      setSavingCategory(false);
    }
  }

  function editProduct(product: Product) {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      category_id: product.category_id || categoryItems.find((item) => item.name === product.category)?.id || "",
      category: product.category,
      description: product.description || "",
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      discount_price: product.discount_price == null ? "" : String(product.discount_price),
      stock_quantity: product.stock_quantity,
      low_stock_alert: product.low_stock_alert,
      image_url: product.image_url || "",
      supplier_name: product.supplier_name || "",
      supplier_phone: product.supplier_phone || "",
      variationsText: optionText(product.variations),
      addOnsText: optionText(product.add_ons),
      active: product.active
    });
    setPreviewFile(null);
    setImageMarkedForRemoval(false);
    setUploadProgress(null);
    setUploadStatus("");
    setMessage(`Editing ${product.name}.`);
  }

  async function uploadProductImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || preparingPhoto || saving) return;
    setMessage("");
    setUploadStatus("");
    setUploadProgress(null);
    const validationError = validateProductImage(file);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setPreparingPhoto(true);
    try {
      setUploadStatus("Preparing product photo...");
      const compressed = await compressProductImage(file);
      setPreviewFile(compressed);
      setImageMarkedForRemoval(false);
      setUploadStatus("Photo ready to upload when you save.");
      setMessage(`Product photo ready. Original ${(file.size / 1024 / 1024).toFixed(1)} MB, upload ${(compressed.size / 1024 / 1024).toFixed(1)} MB.`);
    } catch (error) {
      setPreviewFile(null);
      setUploadStatus("");
      setMessage(error instanceof Error ? error.message : "Product photo could not be prepared.");
    } finally {
      setPreparingPhoto(false);
    }
  }

  function removeProductImage() {
    setPreviewFile(null);
    setDraft((current) => ({ ...current, image_url: "" }));
    setImageMarkedForRemoval(true);
    setUploadProgress(null);
    setUploadStatus("Photo will be removed when you save.");
    setMessage("Product photo removed. Save the product to apply it.");
  }

  async function removeStoredProductImage(productId: string, imageUrl: string) {
    const response = await fetch("/api/inventory/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, imageUrl })
    });
    const payload = await readApiPayload<{ deleted: boolean }>(response);
    if (!response.ok) throw new Error(payload.error || "Product photo could not be removed from storage.");
  }

  async function saveProduct() {
    if (preparingPhoto) return;
    setMessage("");
    setUploadStatus("");
    if (!draft.name.trim()) {
      setMessage("Add a product name before saving.");
      return;
    }
    const pastedImageUrl = (draft.image_url || "").trim();
    const pastedUrlError = selectedImageFile || imageMarkedForRemoval ? null : validateProductImageUrl(pastedImageUrl);
    if (pastedUrlError) {
      setMessage(pastedUrlError);
      return;
    }
    const oldImageUrl = editingId ? items.find((product) => product.id === editingId)?.image_url || "" : "";
    const body = {
      ...draft,
      image_url: selectedImageFile ? (editingId ? oldImageUrl || null : null) : imageMarkedForRemoval ? null : pastedImageUrl || null,
      discount_price: draft.discount_price === "" ? null : Number(draft.discount_price),
      variations: parseOptionText(draft.variationsText),
      add_ons: parseOptionText(draft.addOnsText)
    };
    setSaving(true);
    setUploadProgress(null);
    try {
      setUploadStatus(editingId ? "Saving product changes..." : "Creating product...");
      const response = await fetch(editingId ? `/api/inventory/${editingId}` : "/api/inventory", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await readApiPayload<{ product: Product }>(response);
      if (!response.ok) {
        setMessage(usefulProductError(payload.error, payload.details));
        setUploadStatus("");
        return;
      }
      let product = payload.data?.product;
      if (!product) {
        setUploadStatus("");
        return setMessage("Product saved, but no product details were returned.");
      }

      if (selectedImageFile) {
        setUploadStatus("Uploading product photo...");
        const uploaded = await uploadProductImageFile(selectedImageFile, product.id, oldImageUrl, setUploadProgress);
        product = { ...product, image_url: uploaded.imageUrl };
        setUploadStatus("Product photo uploaded.");
      } else if (imageMarkedForRemoval && oldImageUrl && editingId) {
        setUploadStatus("Removing product photo...");
        await removeStoredProductImage(editingId, oldImageUrl);
        product = { ...product, image_url: null };
        setUploadStatus("Product photo removed.");
      }

      await refreshProducts();
      setQuery("");
      resetProductForm(categoryItems);
      setMessage(editingId ? "Product updated successfully." : "Product saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product could not be saved. Check your connection and try again.");
      setUploadStatus("");
    } finally {
      setSaving(false);
    }
  }
  async function adjust(productId: string) {
    const delta = Number(adjustments[productId] || 0);
    if (!delta) return;
    try {
      const response = await fetch(`/api/inventory/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment_delta: delta, reason: "Inventory screen adjustment" })
      });
      const payload = await readApiPayload<{ product: Product }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Stock could not be updated.");
        return;
      }
      const updated = payload.data?.product;
      if (!updated) return;
      setItems((current) =>
        current.map((product) => (product.id === productId ? updated : product))
      );
      setAdjustments((current) => ({ ...current, [productId]: 0 }));
      setMessage("Stock updated.");
    } catch {
      setMessage("Stock could not be updated. Check your connection and try again.");
    }
  }

  async function deleteProduct(productId: string, productName: string) {
    if (!window.confirm(`Delete ${productName}? Existing orders keep their item history, but this product will be removed from inventory.`)) return;
    try {
      const response = await fetch(`/api/inventory/${productId}`, { method: "DELETE" });
      const payload = await readApiPayload<{ product: Product }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Product could not be deleted.");
        return;
      }
      setItems((current) => current.filter((product) => product.id !== productId));
      setMessage("Product deleted.");
    } catch {
      setMessage("Product could not be deleted. Check your connection and try again.");
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]">
      <Panel>
        <PanelHeader title="Inventory" description="Products, categories, stock, suppliers, and low-stock alerts" />
        <div className="grid gap-3 border-b border-caribbean-line p-4 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, barcode, category, supplier"
              className="h-10 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-10 rounded-card border border-white/10 bg-black/30 px-3 text-sm font-bold text-white"
          >
            <option value="all">All categories</option>
            {categoryItems.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {filtered.map((product) => (
            <div key={product.id} className="rounded-card border border-caribbean-line bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex min-w-0 gap-3">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} loading="lazy" className="h-14 w-14 shrink-0 rounded-card object-cover" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-card bg-caribbean-cloud text-xs font-black text-caribbean-teal dark:bg-slate-950">
                    {product.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-black">{product.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{product.sku} - {product.barcode || "No barcode"}</p>
                  {product.description ? <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{product.description}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={product.stock_quantity <= product.low_stock_alert ? "red" : "green"}>
                      {product.stock_quantity} in stock
                    </Badge>
                    <Badge tone="neutral">{product.category}</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Price</span>
                <strong>{formatMoney(product.discount_price || product.selling_price)}</strong>
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-2">
                <input
                  type="number"
                  value={adjustments[product.id] || 0}
                  onChange={(event) => setAdjustments((current) => ({ ...current, [product.id]: Number(event.target.value) }))}
                  className="h-10 min-w-0 rounded-card border border-caribbean-line px-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"
                />
                <Button size="sm" onClick={() => adjust(product.id)}>Apply</Button>
                <Button variant="secondary" size="icon" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="icon" onClick={() => deleteProduct(product.id, product.name)} aria-label={`Delete ${product.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
                        {product.description ? <p className="mt-1 max-w-md text-xs font-semibold text-slate-500">{product.description}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.category}</td>
                  <td className="px-4 py-3">{formatMoney(product.cost_price)}</td>
                  <td className="px-4 py-3 font-black">
                    <p>{formatMoney(product.discount_price || product.selling_price)}</p>
                    {product.discount_price ? <p className="text-xs font-semibold text-slate-500 line-through">{formatMoney(product.selling_price)}</p> : null}
                  </td>
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
                    <div className="flex gap-2">
                    <Button variant="secondary" size="icon" onClick={() => editProduct(product)} aria-label={`Edit ${product.name}`}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => deleteProduct(product.id, product.name)} aria-label={`Delete ${product.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <p className="font-black text-white">No products yet. Add your first product.</p>
                    <p className="mt-1 text-sm font-semibold text-teal-50/60">Products you add here will appear on the POS and storefront.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title={editingId ? "Edit product" : "Add product"} description="Create products with pricing, images, stock, variations, and add-ons" />
        <div className="grid gap-3 p-4">
          <Field label="Product name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU optional" value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} />
            <Field label="Barcode" value={draft.barcode} onChange={(event) => setDraft({ ...draft, barcode: event.target.value })} />
          </div>
          <SelectField label="Category" value={draft.category_id} onChange={(event) => selectCategory(event.target.value)}>
            {!categoryItems.length ? <option value="">Uncategorized</option> : null}
            {categoryItems
              .filter((category) => category.is_active !== false && category.active !== false)
              .map((category) => <option key={category.id} value={category.id}>{category.icon ? `${category.icon} ` : ""}{category.name}</option>)}
          </SelectField>
          <div className="grid gap-2 rounded-card border border-caribbean-line bg-caribbean-cloud p-3 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-[1fr_auto]">
            <Field label="+ Add new category" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Example: Drinks" />
            <Button type="button" onClick={createQuickCategory} disabled={savingCategory || !newCategoryName.trim()} className="self-end">
              {savingCategory ? "Adding..." : "Add category"}
            </Button>
            {categoryMessage ? <p className="text-sm font-bold text-slate-600 dark:text-slate-300 sm:col-span-2">{categoryMessage}</p> : null}
          </div>
          <Field label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Short menu or item description" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cost price" type="number" value={draft.cost_price} onChange={(event) => setDraft({ ...draft, cost_price: Number(event.target.value) })} />
            <Field label="Selling price" type="number" value={draft.selling_price} onChange={(event) => setDraft({ ...draft, selling_price: Number(event.target.value) })} />
          </div>
          <Field label="Discount price optional" type="number" value={draft.discount_price} onChange={(event) => setDraft({ ...draft, discount_price: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stock quantity" type="number" value={draft.stock_quantity} onChange={(event) => setDraft({ ...draft, stock_quantity: Number(event.target.value) })} />
            <Field label="Low stock alert" type="number" value={draft.low_stock_alert} onChange={(event) => setDraft({ ...draft, low_stock_alert: Number(event.target.value) })} />
          </div>
          <div className="grid gap-3 rounded-card border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-white">Product photo</p>
                <p className="text-xs font-semibold text-teal-50/55">JPG, PNG, WebP, or supported iPhone HEIC/HEIF photos.</p>
              </div>
              {previewImageUrl ? (
                <button type="button" onClick={removeProductImage} disabled={saving || preparingPhoto} className="grid h-9 w-9 place-items-center rounded-card border border-red-300/30 bg-red-500/10 text-red-100 disabled:opacity-50" aria-label="Remove product image">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {previewImageUrl ? (
              <img src={previewImageUrl} alt="Product preview" className="h-40 w-full rounded-card border border-white/10 bg-white object-contain p-2" />
            ) : (
              <div className="grid h-40 place-items-center rounded-card border border-dashed border-white/15 bg-white/[0.04] text-center text-sm font-bold text-teal-50/55">
                <span><ImageIcon className="mx-auto mb-2 h-6 w-6" />No product photo selected.</span>
              </div>
            )}
            <input ref={takePhotoInputRef} type="file" accept={PRODUCT_IMAGE_ACCEPT} capture="environment" className="sr-only" onChange={uploadProductImage} aria-label="Take product photo" />
            <input ref={photoInputRef} type="file" accept={PRODUCT_IMAGE_ACCEPT} className="sr-only" onChange={uploadProductImage} aria-label="Choose product photo from photos" />
            <input ref={fileInputRef} type="file" accept={PRODUCT_IMAGE_ACCEPT} className="sr-only" onChange={uploadProductImage} aria-label="Browse files for product photo" />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" onClick={() => takePhotoInputRef.current?.click()} disabled={saving || preparingPhoto}><Camera className="h-4 w-4" />Take Photo</Button>
              <Button type="button" onClick={() => photoInputRef.current?.click()} disabled={saving || preparingPhoto}><ImageIcon className="h-4 w-4" />Choose Photos</Button>
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving || preparingPhoto}><FolderOpen className="h-4 w-4" />Browse Files</Button>
            </div>
            <p className="text-xs font-semibold text-teal-50/70">Choose photos up to 30 MB. Photos are resized automatically before upload.</p>
            {uploadStatus ? <p className="text-xs font-bold text-teal-50/70">{uploadStatus}</p> : null}
            {uploadProgress !== null ? (
              <div className="overflow-hidden rounded-full bg-white/10" aria-label={`Product photo upload ${uploadProgress}% complete`}>
                <div className="h-2 rounded-full bg-caribbean-teal transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            ) : null}
            <Field
              label="Or paste product image URL"
              value={selectedImageFile ? "" : draft.image_url || ""}
              onChange={(event) => {
                setPreviewFile(null);
                setImageMarkedForRemoval(false);
                setUploadProgress(null);
                const nextUrl = event.target.value;
                setUploadStatus(nextUrl.trim() ? "Image URL ready. Save product changes to apply it." : "");
                setDraft({ ...draft, image_url: nextUrl });
              }}
            />
          </div>
          <Field label="Variations" value={draft.variationsText} onChange={(event) => setDraft({ ...draft, variationsText: event.target.value })} placeholder="Small:0, Medium:8, Large:15" />
          <Field label="Add-ons / extras" value={draft.addOnsText} onChange={(event) => setDraft({ ...draft, addOnsText: event.target.value })} placeholder="Extra sauce:3, Cheese:5" />
          <Field label="Supplier" value={draft.supplier_name} onChange={(event) => setDraft({ ...draft, supplier_name: event.target.value })} />
          <Field label="Supplier phone" value={draft.supplier_phone} onChange={(event) => setDraft({ ...draft, supplier_phone: event.target.value })} />
          <label className="flex items-center gap-3 rounded-card border border-white/10 bg-black/20 p-3 text-sm font-black text-white">
            <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
            Available in POS and storefront
          </label>
          {message ? <p className="rounded-card bg-caribbean-cloud p-3 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">{message}</p> : null}
          <Button variant="primary" onClick={saveProduct} disabled={saving || preparingPhoto}>
            <PackagePlus className="h-4 w-4" />
            {saving ? "Saving..." : editingId ? "Save product changes" : "Save product"}
          </Button>
          {editingId ? (
            <Button variant="secondary" onClick={() => { resetProductForm(categoryItems); setMessage(""); }}>
              Add a new product instead
            </Button>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
