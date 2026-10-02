"use client";

import Image from "next/image";
import "./integration-preview.css";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MapPin, Navigation, Play, RotateCcw, ArrowLeft, Phone, MoreVertical, Paperclip, Smile, Mic, CheckCheck, Clock, ChevronRight, Truck, ShieldCheck } from "lucide-react";

const stories = {
  whatsapp: {
    name: "WhatsApp", title: "An order update. A happier customer.",
    description: "Prepare a message from your order details, review it, and open WhatsApp to keep your customer informed.",
    steps: ["Open your order", "Review the message", "Continue in WhatsApp"],
    messages: ["Order #1042 - ready for pickup", "Hi! Your order #1042 is ready for collection. Thank you for shopping with us.", "Your message is ready to review and send in WhatsApp."],
    url: "/solutions/whatsapp"
  },
  waze: {
    name: "Waze", title: "The next stop starts with your order.",
    description: "Use the delivery address or saved coordinates from an order to open the destination in Waze. Keep delivery status in your POS workspace.",
    steps: ["Review delivery details", "Choose Open in Waze", "Navigate to the customer"],
    messages: ["Delivery order #1042 - address saved", "The order address or coordinates become your destination.", "Waze handles navigation. Your team updates the delivery status in Caribbean POS Connect."],
    url: "/solutions/delivery"
  }
};

function WhatsAppChatPreview({ step }: { step: number }) {
  return (
    <div className="message-demo">
      <div className="message-app-bar"><ArrowLeft size={18} /><div className="message-business-avatar">BB</div><div><strong>Baker Buds</strong><span>Business account</span></div><Phone size={17} /><MoreVertical size={18} /></div>
      <div className="message-thread">
        <span className="message-day">Today</span>
        <div className="message-private"><ShieldCheck size={12} />Illustrative conversation · Sample order</div>
        <div className="message-bubble incoming"><p>Hi! Is my order ready? I can collect around 12 😊</p><time>10:41 AM</time></div>
        <div className="message-bubble outgoing"><p>Hi Aaliyah! Let me check order #1042 for you.</p><time>10:41 AM <CheckCheck size={14} /></time></div>
        <div className="message-order-card"><div className="message-order-photo"><Image src="/marketing/bread.jpg" alt="Fresh bread in a sample bakery order" fill sizes="360px" className="object-cover" /><span>ORDER #1042</span></div><div className="message-order-body"><div><strong>Your pickup order</strong><span className="message-order-state">{step === 0 ? "Preparing" : "Ready for pickup"}</span></div><p>2 × Fresh bread <b>TT$24.00</b></p><p>1 × Orange juice <b>TT$18.00</b></p><div className="message-order-total"><span>Total · Paid</span><strong>TT$42.00</strong></div><span className="message-order-pickup"><MapPin size={12} />Main store · Port of Spain</span></div></div>
        {step >= 1 && <div className="message-bubble outgoing"><p>Your order is ready, Aaliyah! We’ve packed your bread and juice. See you at 12 🙌</p><time>10:42 AM <CheckCheck size={14} /></time></div>}
        {step === 2 && <div className="message-bubble incoming"><p>Perfect, thank you! On my way.</p><time>10:43 AM</time></div>}
      </div>
      <div className="message-composer" aria-hidden="true"><div><Smile size={18} /><span>Message</span><Paperclip size={17} /></div><span className="message-mic"><Mic size={18} /></span></div>
      <p className="integration-example-note" aria-live="polite">{["Find the order behind the conversation.", "Review the prepared pickup update.", "Example of the conversation after you send the update."][step]}</p>
    </div>
  );
}

function DeliveryPreview({ step }: { step: number }) {
  return <div className="delivery-demo">
    <div className="delivery-app-bar"><span><Truck size={18} />Delivery workspace</span><span className="delivery-demo-tag">Sample</span></div>
    <div className="delivery-order-heading"><div><span>ORDER #1042</span><strong>Delivery to Aaliyah</strong></div><span className="delivery-status">{["Assigned", "Route ready", "Out for delivery"][step]}</span></div>
    <div className="delivery-map">
      <svg viewBox="0 0 420 250" role="img" aria-label="Illustrative street map with a delivery route, not live navigation">
        <rect width="420" height="250" fill="#eef2ee" />
        <path d="M0 183Q75 166 151 194T420 211V250H0Z" fill="#cce8f0" />
        <g fill="#dce6d6"><rect x="20" y="17" width="65" height="45" rx="6"/><rect x="193" y="22" width="60" height="47" rx="7"/><rect x="290" y="118" width="75" height="38" rx="6"/></g>
        <g stroke="white" strokeWidth="13" fill="none"><path d="M0 81H420M0 153H420M112 0V205M273 0V200M355 0V198M0 22L420 177"/></g>
        <g stroke="#d9dfe0" strokeWidth="1" fill="none"><path d="M0 81H420M0 153H420M112 0V205M273 0V200M355 0V198"/></g>
        <g fill="#7b8993" fontSize="10" fontFamily="sans-serif"><text x="132" y="74">Queen Street</text><text x="180" y="146">Park Street</text><text x="28" y="235">Port of Spain</text></g>
        <path d="M65 153H112V81H273V49" fill="none" stroke="#fff" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round"/>
        <path d="M65 153H112V81H273V49" fill="none" stroke="#4385f5" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx="65" cy="153" r="13" fill="#4385f5" stroke="white" strokeWidth="4"/><path d="m60 157 5-11 5 11-5-3Z" fill="white"/>
        <circle cx="273" cy="49" r="12" fill="#183847" stroke="white" strokeWidth="4"/><circle cx="273" cy="49" r="4" fill="white"/>
      </svg>
      <div className="delivery-turn"><Navigation size={20} /><div><strong>{step === 0 ? "Review the destination" : "Continue to Queen Street"}</strong><span>{step === 0 ? "Address saved on the order" : "Example route · 350 m to next turn"}</span></div></div>
      <span className="delivery-map-label">Illustrative map</span>
      <div className="delivery-eta"><div><strong>7 min</strong><span>Estimated trip</span></div><div><strong>2.4 km</strong><span>Example distance</span></div><span><Navigation size={15} />Waze</span></div>
    </div>
    <div className="delivery-destination"><span className="delivery-pin"><MapPin size={18} /></span><div><strong>18 Queen Street</strong><span>Port of Spain, Trinidad & Tobago</span><p>Call on arrival · Collect at the entrance</p></div><ChevronRight size={17} /></div>
    <div className="delivery-driver"><span className="delivery-avatar">JM</span><div><strong>Jason M.</strong><span>Assigned driver</span></div><span><Clock size={13} />Pickup 11:45 AM</span></div>
    <p className="integration-example-note" aria-live="polite">{["Review the address and delivery instructions.", "Open the saved destination in Waze to navigate.", "Your driver navigates in Waze; your team updates order status in POS."][step]}</p>
  </div>;
}

export function IntegrationStory({ type }: { type: keyof typeof stories }) {
  const story = stories[type];
  const [step, setStep] = useState(0);
  return <section id={type} className={`integration-story integration-${type}`}>
    <div className="integration-inner">
      <div className="integration-copy">
        <div className="integration-brand"><Image src={`/marketing/${type}.svg`} alt={`${story.name} logo`} width={type === "waze" ? 100 : 38} height={38} /><span>{type === "whatsapp" ? "WhatsApp order updates" : "Delivery directions"}</span></div>
        <h2>{story.title}</h2><p>{story.description}</p>
        <ol>{story.steps.map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}><button type="button" onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button></li>)}</ol>
        <Link href={story.url}>Explore {story.name}<ArrowRight size={18} /></Link>
      </div>
      <div className="integration-demo" aria-label={`${story.name} workflow example`}>
        <div className="integration-demo-title"><span>Interactive example · Sample data</span><span>{step + 1} / 3</span></div>
        <div className="integration-demo-content" key={step}>
          {type === "waze" ? <DeliveryPreview step={step} /> : <WhatsAppChatPreview step={step} />}
        </div>
        <button type="button" className="integration-play" onClick={() => setStep((step + 1) % 3)}>{step === 2 ? <RotateCcw size={18} /> : <Play size={18} />}{step === 2 ? "Replay example" : "Next step"}</button>
      </div>
    </div>
  </section>;
}
