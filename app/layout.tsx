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
  title: "Caribbean POS Connect",
  description:
    "Premium POS, orders, inventory, delivery, receipts, subscriptions, and customer management for Caribbean businesses.",
  metadataBase: appUrl,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/caribbean-pos-connect-icon.png", sizes: "1024x1024", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Caribbean POS Connect",
    statusBarStyle: "black-translucent"
  },
  applicationName: "Caribbean POS Connect",
  formatDetection: {
    telephone: true,
    address: true,
    email: true
  },
  openGraph: {
    title: "Caribbean POS Connect",
    description:
      "Premium POS, storefront, delivery, Waze, WhatsApp, inventory, and reporting for Caribbean businesses.",
    url: appUrlString,
    siteName: "Caribbean POS Connect",
    type: "website",
    images: [
      {
        url: "/caribbean-pos-connect-icon.png",
        width: 1024,
        height: 1024,
        alt: "Caribbean POS Connect app icon"
      }
    ]
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



