import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cleanWhatsAppNumber } from "@/lib/whatsapp";

const business = {
  name: "Caribbean Connect POS",
  phone: "",
  email: "support@caribbeanconnectpos.com",
  whatsapp: "",
  address: "Caribbean service area"
};

const whatsAppLink = business.whatsapp ? `https://wa.me/${cleanWhatsAppNumber(business.whatsapp)}?text=${encodeURIComponent(
  `Hi ${business.name}, I am interested in ${APP_NAME}.`
)}` : "";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-caribbean-cloud px-4 py-8 text-caribbean-ink dark:bg-slate-950 dark:text-white">
      <section className="mx-auto grid max-w-3xl gap-5 rounded-card border border-caribbean-line bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={56} height={56} className="h-14 w-14 rounded-card object-contain" priority />
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-caribbean-teal">{APP_NAME}</p>
            <h1 className="text-2xl font-black">{business.name}</h1>
          </div>
        </div>
        <div className="grid gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {business.phone ? <a href={`tel:${business.phone}`} className="flex items-center gap-2 rounded-card border border-caribbean-line p-3 dark:border-slate-800">
            <Phone className="h-4 w-4 text-caribbean-teal" />
            {business.phone}
          </a> : null}
          <a href={`mailto:${business.email}`} className="flex items-center gap-2 rounded-card border border-caribbean-line p-3 dark:border-slate-800">
            <Mail className="h-4 w-4 text-caribbean-teal" />
            {business.email}
          </a>
          {whatsAppLink ? <a href={whatsAppLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-card border border-caribbean-line p-3 dark:border-slate-800">
            <MessageCircle className="h-4 w-4 text-caribbean-teal" />
            WhatsApp {business.whatsapp}
          </a> : null}
          <p className="flex items-center gap-2 rounded-card border border-caribbean-line p-3 dark:border-slate-800">
            <MapPin className="h-4 w-4 text-caribbean-teal" />
            {business.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/online" className="rounded-card bg-caribbean-teal px-4 py-2 text-sm font-black text-white">Storefront</Link>
          <Link href="/privacy" className="rounded-card border border-caribbean-line px-4 py-2 text-sm font-black dark:border-slate-700">Privacy</Link>
          <Link href="/login" className="rounded-card border border-caribbean-line px-4 py-2 text-sm font-black dark:border-slate-700">Staff login</Link>
        </div>
      </section>
    </main>
  );
}
