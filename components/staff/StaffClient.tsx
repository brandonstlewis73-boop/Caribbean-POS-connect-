"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Bike, ChefHat, CircleUserRound, Headset, ShieldCheck, Store, Trash2, Upload, UserCog, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { ROLE_LABELS, STAFF_AVATAR_OPTIONS, STAFF_ROLES } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { cn } from "@/lib/cn";
import type { Role, StaffInput, User } from "@/lib/types";

const roleTone: Record<string, "neutral" | "green" | "coral" | "amber" | "red" | "teal"> = {
  owner: "teal",
  admin: "teal",
  manager: "green",
  cashier: "amber",
  dispatcher: "coral",
  driver: "neutral",
  kitchen: "red",
  staff: "neutral"
};

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: ShieldCheck,
  admin: ShieldCheck,
  manager: UserCog,
  cashier: Store,
  dispatcher: Headset,
  driver: Bike,
  kitchen: ChefHat,
  staff: CircleUserRound
};

function emptyDraft(): User {
  return {
    id: "new",
    name: "",
    email: "",
    phone: "",
    role: "cashier",
    active: true,
    avatar_key: "teal-register",
    avatar_url: null
  };
}

function avatarFor(user: User) {
  return STAFF_AVATAR_OPTIONS.find((avatar) => avatar.key === user.avatar_key) || STAFF_AVATAR_OPTIONS[0];
}

function Avatar({ user, size = "lg" }: { user: User; size?: "sm" | "lg" }) {
  const avatar = avatarFor(user);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || avatar.initials;
  const dimensions = size === "sm" ? "h-10 w-10 text-xs" : "h-16 w-16 text-lg";
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className={cn(dimensions, "shrink-0 rounded-2xl object-cover ring-1 ring-white/15")} />;
  }
  return (
    <span className={cn(dimensions, "grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-black text-slate-950 shadow-soft", avatar.gradient)}>
      {initials}
    </span>
  );
}

function toPayload(user: User): StaffInput {
  return {
    name: user.name.trim(),
    email: user.email.trim(),
    phone: user.phone?.trim() || null,
    role: user.role === "admin" ? "owner" : user.role,
    active: user.active,
    avatar_key: user.avatar_key || "teal-register",
    avatar_url: user.avatar_url || null
  };
}

export function StaffClient({ staff }: { staff: User[] }) {
  const [items, setItems] = useState(staff);
  const [selectedId, setSelectedId] = useState(staff[0]?.id || "new");
  const [draft, setDraft] = useState<User>(staff[0] || emptyDraft());
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCount = useMemo(() => items.filter((user) => user.active).length, [items]);

  function selectStaff(user: User) {
    setSelectedId(user.id);
    setDraft({ ...user });
    setMessage("");
  }

  function startNew() {
    const next = emptyDraft();
    setSelectedId("new");
    setDraft(next);
    setMessage("Set up the staff profile, then save it.");
  }

  async function refreshStaff(nextSelectedId: string) {
    const response = await fetch("/api/staff");
    const payload = await readApiPayload<{ staff: User[] }>(response);
    if (payload.data?.staff) {
      setItems(payload.data.staff);
      const selected = payload.data.staff.find((user) => user.id === nextSelectedId);
      if (selected) setDraft(selected);
    }
  }

  async function saveStaff() {
    setMessage("");
    if (!draft.name.trim() || !draft.email.trim()) {
      setMessage("Staff name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const isNew = selectedId === "new";
      const response = await fetch(isNew ? "/api/staff" : `/api/staff/${selectedId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft))
      });
      const payload = await readApiPayload<{ staff: User }>(response);
      if (!response.ok || !payload.data?.staff) {
        setMessage(payload.error || "Staff profile could not be saved.");
        return;
      }
      setSelectedId(payload.data.staff.id);
      await refreshStaff(payload.data.staff.id);
      setMessage("Staff profile saved.");
    } catch {
      setMessage("Staff profile could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff() {
    if (selectedId === "new") return;
    if (!window.confirm(`Delete ${draft.name || "this staff profile"}? Assigned orders will stay in order history but this staff profile will be removed.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/staff/${selectedId}`, { method: "DELETE" });
      const payload = await readApiPayload<{ staff: User }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Staff profile could not be deleted.");
        return;
      }
      const remaining = items.filter((user) => user.id !== selectedId);
      setItems(remaining);
      const next = remaining[0] || emptyDraft();
      setSelectedId(remaining[0]?.id || "new");
      setDraft(next);
      setMessage("Staff profile deleted.");
    } catch {
      setMessage("Staff profile could not be deleted. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function uploadAvatar(file?: File) {
    if (!file) return;
    if (file.size > 250_000) {
      setMessage("Use a profile image under 250 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, avatar_url: String(reader.result || ""), avatar_key: current.avatar_key || "teal-register" }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          title="Staff"
          description={`${activeCount} active of ${items.length} profiles`}
          action={
            <Button variant="primary" onClick={startNew}>
              <UsersRound className="h-4 w-4" />
              Add Staff
            </Button>
          }
        />
        <div className="divide-y divide-white/10">
          {items.map((user) => {
            const Icon = roleIcons[user.role] || CircleUserRound;
            return (
              <button
                key={user.id}
                onClick={() => selectStaff(user)}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition",
                  selectedId === user.id ? "bg-cyan-300/10" : "hover:bg-white/[0.06]"
                )}
              >
                <Avatar user={user} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{user.name}</span>
                  <span className="block truncate text-xs font-semibold text-teal-50/55">{user.email}</span>
                </span>
                <Badge tone={roleTone[user.role]}>
                  <Icon className="mr-1 h-3.5 w-3.5" />
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={selectedId === "new" ? "New staff profile" : "Staff profile"} />
        <div className="grid gap-5 p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            <div className="rounded-card border border-white/10 bg-black/25 p-4">
              <Avatar user={draft} />
              <p className="mt-3 text-sm font-black">{draft.name || "Staff profile"}</p>
              <p className="text-xs font-semibold text-teal-50/55">{ROLE_LABELS[draft.role] || draft.role}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, avatar_key: avatar.key, avatar_url: null })}
                  className={cn(
                    "grid gap-2 rounded-card border p-3 text-left text-xs font-black",
                    draft.avatar_key === avatar.key && !draft.avatar_url ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-black/20"
                  )}
                >
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-slate-950", avatar.gradient)}>
                    {avatar.initials}
                  </span>
                  {avatar.label}
                </button>
              ))}
            </div>
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white hover:bg-white/[0.12]">
              <Upload className="h-4 w-4" />
              Upload Photo
              <input className="sr-only" type="file" accept="image/*" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
            </label>
          </div>

          <div className="grid content-start gap-3">
            <Field label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Phone" value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <Field label="Email" type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Role" value={draft.role === "admin" ? "owner" : draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}>
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </SelectField>
              <SelectField label="Status" value={draft.active ? "active" : "inactive"} onChange={(event) => setDraft({ ...draft, active: event.target.value === "active" })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="primary" onClick={saveStaff} disabled={saving}>
                {saving ? "Saving..." : "Save Staff Profile"}
              </Button>
              {selectedId !== "new" ? (
                <Button variant="danger" onClick={deleteStaff} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>
            {message ? <p className="rounded-card bg-cyan-300/10 p-3 text-sm font-black text-cyan-100">{message}</p> : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}
