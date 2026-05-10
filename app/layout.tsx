import type { Metadata } from "next";
import "./globals.css";

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "";
  const urlWithProtocol = configuredUrl
    ? configuredUrl.includes("://")
      ? configuredUrl
      : `https://${configuredUrl}`
    : "http://localhost:3000";

  try {
    return new URL(urlWithProtocol);
  } catch {
    return new URL("http://localhost:3000");
  }
}

const appUrl = getAppUrl();
const appUrlString = appUrl.toString();

export const metadata: Metadata = {
  title: "Caribbean Connect POS",
  description:
    "Premium POS, orders, inventory, delivery, receipts, subscriptions, and customer management for Trinidad and Tobago businesses.",
  metadataBase: appUrl,
  icons: {
    icon: "/logo.svg"
  },
  openGraph: {
    title: "Caribbean Connect POS",
    description:
      "Premium POS, storefront, delivery, Waze, WhatsApp, inventory, and reporting for Trinidad and Tobago.",
    url: appUrlString,
    siteName: "Caribbean Connect POS",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
