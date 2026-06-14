"use client";

import { useEffect, useRef, useState } from "react";

function formatValue(value: number, prefix = "", suffix = "") {
  return `${prefix}${Math.round(value).toLocaleString("en-US")}${suffix}`;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1200
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [duration, value]);

  return <span>{formatValue(displayValue, prefix, suffix)}</span>;
}
