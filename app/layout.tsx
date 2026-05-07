import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Caribbean Connect POS",
  description:
    "Premium POS, orders, inventory, delivery, receipts, subscriptions, and customer management for Trinidad and Tobago businesses.",
  metadataBase: new URL(appUrl),
  icons: {
    icon: "/logo.svg"
  },
  openGraph: {
    title: "Caribbean Connect POS",
    description:
      "Premium POS, storefront, delivery, Waze, WhatsApp, inventory, and reporting for Trinidad and Tobago.",
    url: appUrl,
    siteName: "Caribbean Connect POS",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
