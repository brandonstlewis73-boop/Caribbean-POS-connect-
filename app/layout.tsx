import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";
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
    "Premium POS, orders, inventory, delivery, receipts, subscriptions, and customer management for Caribbean businesses.",
  metadataBase: appUrl,
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Caribbean Connect POS",
    statusBarStyle: "black-translucent"
  },
  applicationName: "Caribbean Connect POS",
  formatDetection: {
    telephone: true,
    address: true,
    email: true
  },
  openGraph: {
    title: "Caribbean Connect POS",
    description:
      "Premium POS, storefront, delivery, Waze, WhatsApp, inventory, and reporting for Caribbean businesses.",
    url: appUrlString,
    siteName: "Caribbean Connect POS",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03100f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
