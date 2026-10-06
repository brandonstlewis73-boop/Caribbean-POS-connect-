"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Volume2, X } from "lucide-react";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Order } from "@/lib/types";

type ToastOrder = Pick<Order, "id" | "order_number" | "order_type" | "total" | "customer_snapshot">;

const POLL_MS = 12000;
const MAX_TOASTS = 3;

function orderSummary(order: ToastOrder, currency: string) {
  const name = order.customer_snapshot?.name || "Customer";
  const type = order.order_type === "delivery" ? "Delivery" : order.order_type === "pickup" ? "Pickup" : "Order";
  return `${name} - ${type} - ${money(order.total, currency)}`;
}

function playCleanTone() {
  const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.16);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.3);
  window.setTimeout(() => void context.close().catch(() => undefined), 450);
}

export function OrderLiveAlerts({
  enabled,
  playSound,
  browserNotifications,
  showPreview,
  currency
}: {
  enabled: boolean;
  playSound: boolean;
  browserNotifications: boolean;
  showPreview: boolean;
  currency: string;
}) {
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const interactedRef = useRef(false);
  const [toasts, setToasts] = useState<ToastOrder[]>([]);
  const [muted, setMuted] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    function markInteracted() {
      interactedRef.current = true;
    }
    window.addEventListener("pointerdown", markInteracted, { passive: true });
    window.addEventListener("keydown", markInteracted);
    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let inFlight = false;


    async function pollOrders() {
      if (cancelled || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/orders?status=new", { cache: "no-store" });
        const payload = await readApiPayload<{ orders: Order[] }>(response);
        if (cancelled) return;
        if (!response.ok) {
          setWarning(payload.error || "Live updates disconnected. Retrying...");
          return;
        }
        setWarning("");
        const orders = [...(payload.data?.orders || [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (!initializedRef.current) {
          knownIdsRef.current = new Set(orders.map((order) => order.id));
          initializedRef.current = true;
          return;
        }

        const incoming = orders.filter((order) => !knownIdsRef.current.has(order.id));
        if (!incoming.length) return;

        for (const order of incoming.reverse()) {
          knownIdsRef.current.add(order.id);
          window.dispatchEvent(new CustomEvent("caribbean:new-order", { detail: order }));
          if (browserNotifications && "Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("New order received", {
              body: showPreview ? `#${order.order_number} ${orderSummary(order, currency)}` : `Order #${order.order_number}`,
              tag: `order-${order.id}`
            });
            notification.onclick = () => {
              window.focus();
              window.location.href = `/orders?order=${encodeURIComponent(order.id)}`;
            };
          }
        }

        setToasts((current) => [...incoming, ...current].slice(0, MAX_TOASTS));
        if (playSound && !muted && interactedRef.current) {
          try {
            playCleanTone();
          } catch {
            setWarning("Sound alert was blocked by the browser. Visual alerts are still active.");
          }
        }
      } catch {
        if (!cancelled) setWarning("Live updates disconnected. Retrying...");
      } finally {
        inFlight = false;
      }
    }

    const onVisibility = () => { if (document.visibilityState === "visible") void pollOrders(); };
    document.addEventListener("visibilitychange", onVisibility);
    void pollOrders();
    const timer = window.setInterval(pollOrders, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [browserNotifications, currency, enabled, muted, playSound, showPreview]);

  if (!enabled) return null;

  return (
    <>
      <div className="fixed right-3 top-20 z-50 grid w-[min(360px,calc(100vw-1.5rem))] gap-2 md:right-5 md:top-24">
        {warning ? (
          <div className="rounded-card border border-amber-300/30 bg-amber-950/90 p-3 text-xs font-bold text-amber-50 shadow-soft backdrop-blur-xl">
            {warning}
          </div>
        ) : null}
        {toasts.map((order) => (
          <div key={order.id} className="rounded-2xl border border-cyan-200/30 bg-slate-950/95 p-4 text-white shadow-glow backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black">New order received</p>
                <p className="mt-1 text-xs font-bold text-cyan-100/70">#{order.order_number}</p>
              </div>
              <button type="button" aria-label="Dismiss new order alert" onClick={() => setToasts((current) => current.filter((item) => item.id !== order.id))} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-cyan-50 hover:bg-white/15">
                <X className="h-4 w-4" />
              </button>
            </div>
            {showPreview ? (
              <p className="mt-2 text-sm font-semibold leading-5 text-teal-50/80">{orderSummary(order, currency)}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={`/orders?order=${encodeURIComponent(order.id)}`} className="inline-flex min-h-9 items-center rounded-card bg-cyan-300 px-3 text-xs font-black text-slate-950 hover:bg-cyan-200">
                View order
              </Link>
              {playSound ? (
                <button type="button" onClick={() => setMuted((value) => !value)} className="inline-flex min-h-9 items-center gap-2 rounded-card border border-white/10 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/15">
                  {muted ? <BellOff className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {muted ? "Muted" : "Mute"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite">
        {toasts[0] ? `New order received, order ${toasts[0].order_number}` : ""}
      </div>
      <Bell className="hidden" aria-hidden="true" />
    </>
  );
}
