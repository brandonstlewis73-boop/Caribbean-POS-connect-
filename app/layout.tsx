import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Caribbean POS Connect",
  description:
    "POS, customer management, inventory, deliveries, Waze, WhatsApp, loyalty, and reports for Trinidad and Tobago businesses.",
  metadataBase: new URL(appUrl),
  icons: {
    icon: "/logo.svg"
  },
  openGraph: {
    title: "Caribbean POS Connect",
    description:
      "Full-stack POS, storefront, delivery, Waze, WhatsApp, loyalty, inventory, and reporting for Trinidad and Tobago.",
    url: appUrl,
    siteName: "Caribbean POS Connect",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
