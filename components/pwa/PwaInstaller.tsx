"use client";

import { useEffect } from "react";

export function PwaInstaller() {
  useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { standalone?: boolean };

    function syncDisplayMode() {
      const isStandalone = standaloneQuery.matches || nav.standalone === true;
      document.documentElement.classList.toggle("pwa-standalone", isStandalone);
      document.documentElement.dataset.displayMode = isStandalone ? "standalone" : "browser";
    }

    syncDisplayMode();
    standaloneQuery.addEventListener("change", syncDisplayMode);

    return () => {
      standaloneQuery.removeEventListener("change", syncDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("PWA service worker registration failed", error);
    });
  }, []);

  return null;
}
