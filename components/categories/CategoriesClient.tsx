"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Palette, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import type { Category } from "@/lib/types";

const colorOptions = ["#14b8a6", "#22d3ee", "#facc15", "#22c55e", "#f9735b", "#38bdf8", "#a78bfa", "#f472b6"];

function emptyCategory(nextOrder: number) {
  return {
    name: "",
    slug: "",
    description: "",
    icon: "🍽",
    color: colorOptions[nextOrder % colorOptions.length],
    sort_order: nextOrder * 10,
    is_active: true
  };
}

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState(categories);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(categories[0]?.id || "");
  const [draft, setDraft] = useState(emptyCategory(categories.length + 1));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const selected = items.find((item) => item.id === selectedId);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    return items.filter((category) =>
      !q || [category.name, category.slug, category.description, category.icon]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, deferredQuery]);

  function edit(category: Category) {
    setSelectedId(category.id);
    setDraft({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || category.name.slice(0, 2).toUpperCase(),
      color: category.color || colorOptions[0],
      sort_order: category.sort_order,
      is_active: category.is_active
    });
    setMessage("");
  }

  async function refresh() {
    const response = await fetch("/api/categories?includeInactive=true");
    const payload = await readApiPayload<{ categories: Category[] }>(response);
    if (response.ok && payload.data?.categories) setItems(payload.data.categories);
  }

  async function save() {
    setMessage("");
    if (!draft.name.trim()) {
      setMessage("Add a category name first.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(selected ? `/api/categories/${selected.id}` : "/api/categories", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = await readApiPayload<{ category: Category }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Category could not be saved.");
        return;
      }
      await refresh();
      if (!selected) setDraft(emptyCategory(items.length + 2));
      setMessage(selected ? "Category updated." : "Category added.");
    } catch {
      setMessage("Category could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(category: Category) {
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !category.is_active })
    });
    const payload = await readApiPayload<{ category: Category }>(response);
    if (!response.ok) return setMessage(payload.error || "Category could not be updated.");
    await refresh();
    setMessage(category.is_active ? "Category hidden." : "Category visible.");
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete ${category.name}? Products in this category will move to Uncategorized.`)) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const payload = await readApiPayload<{ category: Category }>(response);
    if (!response.ok) return setMessage(payload.error || "Category could not be deleted.");
    setSelectedId("");
    setDraft(emptyCategory(items.length));
    await refresh();
    setMessage("Category deleted.");
  }

  async function move(category: Category, direction: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    const index = sorted.findIndex((item) => item.id === category.id);
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    const reordered = next.map((item, itemIndex) => ({ id: item.id, sort_order: (itemIndex + 1) * 10 }));
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", categories: reordered })
    });
    const payload = await readApiPayload<{ categories: Category[] }>(response);
    if (!response.ok) return setMessage(payload.error || "Category order could not be saved.");
    if (payload.data?.categories) setItems(payload.data.categories);
    setMessage("Category order saved.");
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      <Panel>
        <PanelHeader title="Categories" description="Add, edit, hide, delete, and reorder item sections for this business." />
        <div className="border-b border-white/10 p-4">
          <label className="relative block min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories"
              className="h-11 w-full rounded-card border border-white/10 bg-black/30 pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-cyan-300"
            />
          </label>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((category) => (
            <article key={category.id} className="rounded-card border border-white/10 bg-black/20 p-3">
              <button onClick={() => edit(category)} className="flex w-full min-w-0 items-start gap-3 text-left">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card text-lg font-black text-slate-950" style={{ background: category.color || "#14b8a6" }}>
                  {category.icon || category.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-white">{category.name}</span>
                  <span className="block text-xs font-bold text-cyan-100/55">/{category.slug}</span>
                  <span className="mt-2 flex flex-wrap gap-2">
                    <Badge tone={category.is_active ? "green" : "neutral"}>{category.is_active ? "Visible" : "Hidden"}</Badge>
                    <Badge tone="teal">Order {category.sort_order}</Badge>
                  </span>
                </span>
              </button>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <Button size="icon" variant="secondary" onClick={() => move(category, -1)} aria-label={`Move ${category.name} up`}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => move(category, 1)} aria-label={`Move ${category.name} down`}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="secondary" onClick={() => toggle(category)} aria-label={category.is_active ? "Hide category" : "Show category"}>
                  {category.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="danger" onClick={() => remove(category)} aria-label={`Delete ${category.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </article>
          ))}
          {!filtered.length ? (
            <div className="rounded-card border border-white/10 bg-black/20 p-5 text-center sm:col-span-2 xl:col-span-3">
              <p className="font-black text-white">No categories found.</p>
              <p className="mt-1 text-sm font-semibold text-cyan-100/55">Create food, drink, service, add-on, or seasonal sections for your storefront and POS.</p>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title={selected ? "Edit category" : "Add category"} description="Use icons and colors to make POS sections easy to scan." />
        <div className="grid gap-3 p-4">
          <Field label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Food, Drinks, Specials" />
          <Field label="Slug optional" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="food" />
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <Field label="Icon" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} />
            <label className="grid gap-1.5 text-sm font-bold text-teal-50">
              <span className="flex items-center gap-2"><Palette className="h-4 w-4" /> Color</span>
              <input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} className="h-10 w-full rounded-card border border-white/10 bg-black/30 p-1" />
            </label>
          </div>
          <TextAreaField label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
          <label className="flex items-center gap-3 rounded-card border border-white/10 bg-black/20 p-3 text-sm font-black text-white">
            <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />
            Show this category in POS and storefront
          </label>
          {message ? <p className="rounded-card bg-white/10 p-3 text-sm font-bold text-cyan-50">{message}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="primary" onClick={save} disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : selected ? "Save changes" : "Add category"}
            </Button>
            <Button variant="secondary" onClick={() => { setSelectedId(""); setDraft(emptyCategory(items.length + 1)); }}>
              New category
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
