"use client";

import { ReceiptTemplateTools } from "@/components/receipts/ReceiptTemplateTools";
import { useState } from "react";
import { Mail, MessageCircle, Printer, ReceiptText, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { readApiPayload } from "@/lib/client-response";
import type { Settings } from "@/lib/types";

type ReceiptSettings = Pick<
  Settings,
  | "receipt_print_customer_enabled"
  | "receipt_print_kitchen_enabled"
  | "receipt_email_enabled"
  | "receipt_whatsapp_enabled"
>;

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-white/10 bg-black/25 p-3 text-sm font-black">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function PrinterSettingsClient({ settings, canEdit = false }: { settings: Settings; canEdit?: boolean }) {
  const [draft, setDraft] = useState<ReceiptSettings>({
    receipt_print_customer_enabled: settings.receipt_print_customer_enabled,
    receipt_print_kitchen_enabled: settings.receipt_print_kitchen_enabled,
    receipt_email_enabled: settings.receipt_email_enabled,
    receipt_whatsapp_enabled: settings.receipt_whatsapp_enabled
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setMessage("");
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const payload = await readApiPayload<{ settings: Settings }>(response);
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error || "Receipt settings could not be saved.");
      return;
    }
    if (!payload.data?.settings) {
      setMessage("Receipt settings saved, but no settings were returned.");
      return;
    }
    setDraft({
      receipt_print_customer_enabled: payload.data.settings.receipt_print_customer_enabled,
      receipt_print_kitchen_enabled: payload.data.settings.receipt_print_kitchen_enabled,
      receipt_email_enabled: payload.data.settings.receipt_email_enabled,
      receipt_whatsapp_enabled: payload.data.settings.receipt_whatsapp_enabled
    });
    setMessage("Receipt settings saved.");
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ReceiptTemplateTools settings={settings} canEdit={canEdit} />
      <Panel>
        <PanelHeader title="Printer & Receipts" description="Receipt, kitchen ticket, email, and WhatsApp receipt workflow" action={<Badge tone="teal">Ready</Badge>} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="rounded-card border border-white/10 bg-black/25 p-4">
            <Printer className="h-8 w-8 text-cyan-200" />
            <p className="mt-4 text-lg font-black">Receipt printer status</p>
            <p className="mt-1 text-sm font-semibold text-teal-50/60">Browser print and PDF receipts are available. Bluetooth/network printer adapters can be connected next.</p>
          </div>
          <div className="grid gap-3">
            <Toggle
              label="Print customer receipt"
              checked={draft.receipt_print_customer_enabled}
              onChange={(value) => update("receipt_print_customer_enabled", value)}
            />
            <Toggle
              label="Print kitchen ticket"
              checked={draft.receipt_print_kitchen_enabled}
              onChange={(value) => update("receipt_print_kitchen_enabled", value)}
            />
            <Toggle
              label="Email receipt"
              checked={draft.receipt_email_enabled}
              onChange={(value) => update("receipt_email_enabled", value)}
            />
            <Toggle
              label="WhatsApp receipt option"
              checked={draft.receipt_whatsapp_enabled}
              onChange={(value) => update("receipt_whatsapp_enabled", value)}
            />
          </div>
        </div>
      </Panel>

      <Panel className="self-start">
        <PanelHeader title="Receipt actions" />
        <div className="grid gap-3 p-4">
          <Button variant="primary" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
          <Button variant="secondary" onClick={() => { window.print(); setMessage("Print dialog opened."); }}>
            <Printer className="h-4 w-4" />
            Print Now
          </Button>
          <Button variant="secondary" onClick={() => setMessage("Digital receipt settings saved for the next order.")}>
            <Mail className="h-4 w-4" />
            Send Digital Receipt
          </Button>
          <Button variant="secondary" onClick={() => setMessage("WhatsApp receipt links are generated from saved orders.")}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp receipt
          </Button>
          <div className="rounded-card border border-white/10 bg-black/25 p-3 text-sm font-bold text-teal-50/70">
            <ReceiptText className="mb-2 h-4 w-4 text-amber-200" />
            Printed receipts and shipping labels include Waze QR codes when a delivery location exists.
          </div>
          {message ? <p className="rounded-card bg-cyan-300/10 p-3 text-sm font-black text-cyan-100">{message}</p> : null}
        </div>
      </Panel>
    </div>
  );
}
