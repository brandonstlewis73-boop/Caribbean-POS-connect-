import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-caribbean-cloud px-4 py-8 text-caribbean-ink dark:bg-slate-950 dark:text-white">
      <section className="mx-auto grid max-w-3xl gap-5 rounded-card border border-caribbean-line bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-14 w-14 rounded-card object-contain" />
          <div>
            <p className="text-sm font-bold uppercase tracking-normal text-caribbean-teal">Savannah & Sea Retail Ltd.</p>
            <h1 className="text-2xl font-black">Privacy Policy</h1>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {APP_NAME} stores customer and order information so businesses can prepare receipts, complete deliveries, manage loyalty, provide customer service, and maintain accurate sales records.
        </p>
        <div className="grid gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <p><strong>Information collected:</strong> name, phone, email, delivery address, delivery instructions, order history, payment method, marketing consent, loyalty points, and staff activity logs.</p>
          <p><strong>Use of information:</strong> order fulfillment, delivery navigation, receipts, customer support, loyalty, reporting, inventory control, and optional marketing only when consent is granted.</p>
          <p><strong>Protection:</strong> staff access is permission controlled, passwords are hashed, session cookies are HTTP-only, and important admin or order changes are written to an audit log.</p>
          <p><strong>WhatsApp and Waze:</strong> the first version opens click-to-chat and navigation links. It does not automatically send WhatsApp messages or share customer data with those services until a user clicks a link.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/online" className="rounded-card bg-caribbean-teal px-4 py-2 text-sm font-black text-white">Storefront</Link>
          <Link href="/contact" className="rounded-card border border-caribbean-line px-4 py-2 text-sm font-black dark:border-slate-700">Contact</Link>
          <Link href="/login" className="rounded-card border border-caribbean-line px-4 py-2 text-sm font-black dark:border-slate-700">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Staff login
          </Link>
        </div>
      </section>
    </main>
  );
}
