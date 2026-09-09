"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, MapPin, Navigation, Play, RotateCcw } from "lucide-react";

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
        <div className="integration-demo-title"><span>Example order</span><span>{step + 1} / 3</span></div>
        <div className="integration-demo-content" key={step}>
          {type === "waze" ? <div className="delivery-symbol"><MapPin size={46} /><Navigation size={30} /></div> : <Image src="/marketing/whatsapp.svg" alt="" width={48} height={48} />}
          <p aria-live="polite">{story.messages[step]}</p>
          {step === 2 && <Check size={24} />}
        </div>
        <button type="button" className="integration-play" onClick={() => setStep((step + 1) % 3)}>{step === 2 ? <RotateCcw size={18} /> : <Play size={18} />}{step === 2 ? "Replay example" : "Next step"}</button>
      </div>
    </div>
  </section>;
}
