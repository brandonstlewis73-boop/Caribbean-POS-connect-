"use client";

import { memo, useEffect, useRef, useState } from "react";

function formatValue(value: number, prefix = "", suffix = "") {
  return `${prefix}${Math.round(value).toLocaleString("en-US")}${suffix}`;
}

function AnimatedCounterComponent({
  value,
  prefix = "",
  suffix = "",
  duration = 900
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }

    const startAnimation = () => {
      const start = performance.now();
      const frameMs = 50;
      setDisplayValue(0);

      intervalRef.current = window.setInterval(() => {
        const progress = Math.min((performance.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(value * eased);

        if (progress >= 1 && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          setDisplayValue(value);
        }
      }, frameMs);
    };

    const startId = window.setTimeout(startAnimation, 220);

    return () => {
      window.clearTimeout(startId);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [duration, value]);

  return <span>{formatValue(displayValue, prefix, suffix)}</span>;
}

export const AnimatedCounter = memo(AnimatedCounterComponent);
