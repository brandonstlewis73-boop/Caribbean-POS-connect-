import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import type { OrderDelayReview } from '@/lib/ai-order-delays';
export function AiOrderDelayReview({ review, onDownload }: { review: OrderDelayReview; onDownload: () => void }) {
  return <article className="aw-order-review" aria-label="Verified order review">
    <header><h3><ClipboardList size={17}/>Active orders to review</h3><Link href="/orders">Open orders</Link></header>
    <p className="aw-review-asof">Checked {review.asOf.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</p>
    {review.orders.length ? <ul>{review.orders.map(order => <li key={order.number}>
      <div><strong>#{order.number}</strong><span>{order.status.replaceAll('_', ' ')}</span></div>
      <p>Created: {order.createdAt ? order.createdAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : 'Timestamp needs checking'}</p>
      <p>Elapsed since creation: {order.elapsedMinutes === null ? 'Needs checking' : `${order.elapsedMinutes} min`}</p>
    </li>)}</ul> : <p>No active orders found.</p>}
    {review.limited ? <p className="aw-review-note">Showing {review.orders.length} oldest orders from {review.reviewed} reviewed. Additional orders may exist.</p> : null}
    <button type="button" className="aw-review-download" onClick={onDownload}>Download review</button>
    <p className="aw-review-note">Elapsed time alone does not prove a delay. No promised completion times were provided.</p>
  </article>;
}
