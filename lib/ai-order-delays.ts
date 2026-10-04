import type { LocalGeneration } from './local-ai-config';
export const ACTIVE_ORDER_STATUSES = ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery'];
export type OrderDelayReview = {
  asOf: string; reviewed: number; limited: boolean;
  orders: { number: string; status: string; createdAt: string | null; elapsedMinutes: number | null }[];
};
export function buildOrderDelayReview(rows: { number: string; status: string; createdAt: string }[], asOf: string, limited = false): OrderDelayReview {
  const now = Date.parse(asOf);
  const active = rows.filter(row => ACTIVE_ORDER_STATUSES.includes(row.status));
  const time = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity;
  active.sort((a, b) => time(a.createdAt) - time(b.createdAt));
  return { asOf, reviewed: active.length, limited: limited || active.length > 20,
    orders: active.slice(0, 20).map(row => {
      const created = Date.parse(row.createdAt);
      return { number: row.number, status: row.status,
        createdAt: Number.isFinite(created) ? new Date(created).toISOString() : null,
        elapsedMinutes: Number.isFinite(created) && created <= now ? Math.floor((now - created) / 60000) : null };
    }) };
}
export function orderDelayReviewText(review: OrderDelayReview) {
  return `Active order review as of ${review.asOf}\n${review.orders.length ? review.orders.map(order => `#${order.number} · ${order.status.replaceAll('_', ' ')} · Created: ${order.createdAt || 'Timestamp needs checking'} · Elapsed: ${order.elapsedMinutes === null ? 'Needs checking' : `${order.elapsedMinutes} min`}`).join('\n') : 'No active orders found.'}\n${review.limited ? 'This is a limited selection of the oldest orders; additional orders may exist.\n' : ''}Elapsed time alone does not prove a delay. No promised completion times were provided.`;
}
export function prepareOrderDelayAdvice(prompt: string, review: OrderDelayReview): LocalGeneration {
  return { purpose: 'order-delay', orderDelayFacts: review,
    instructions: `The app already displays the verified active-order review. Write a brief plain-language checklist of useful next steps for staff.
Use bullet points, not code, JSON, tables, sample data, or another order report.
Use only the provided order facts. If referring to an order, use its exact number. Do not invent orders, dates, prices, costs, or customer details.
Elapsed time is time since creation, not proof of a missed deadline. No promised completion times are provided. Do not assert an order is definitely delayed, promise a ready time, or claim an action was performed.
Output only suggested next steps.`,
    input: `User request:\n${prompt.slice(0, 1800)}\n\nVerified order review:\n${orderDelayReviewText(review)}` };
}
