"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
export type Controls = {
  x: number;
  z: number;
  run: boolean;
  yaw: number;
  pitch: number;
  interact: number;
  pickup: number;
  enabled: boolean;
  reset: number;
};
export function useControls(
  root: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const input = useRef<Controls>({
    x: 0,
    z: 0,
    run: false,
    yaw: 0,
    pitch: 0.28,
    interact: 0,
    pickup: 0,
    enabled,
    reset: 0,
  });
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const joystick = useRef<number | null>(null),
    look = useRef<{ id: number; x: number; y: number } | null>(null);
  const reset = () => {
    keys.current.clear();
    input.current.x = 0;
    input.current.z = 0;
    input.current.run = false;
    joystick.current = null;
    look.current = null;
    setStick({ x: 0, y: 0 });
  };
  useEffect(() => {
    input.current.enabled = enabled;
    if (!enabled) reset();
  }, [enabled]);
  useEffect(() => {
    const update = () => {
      const k = keys.current;
      input.current.x =
        Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft"));
      input.current.z =
        Number(k.has("KeyS") || k.has("ArrowDown")) -
        Number(k.has("KeyW") || k.has("ArrowUp"));
      input.current.run = k.has("ShiftLeft") || k.has("ShiftRight");
    };
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (
        !input.current.enabled ||
        !root.current?.contains(document.activeElement) ||
        /INPUT|SELECT|TEXTAREA/.test(el.tagName)
      )
        return;
      if (event.code === "KeyE" && event.type === "keydown" && !event.repeat) {
        input.current.interact++;
        event.preventDefault();
      }
      if (
        ![
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ShiftLeft",
          "ShiftRight",
        ].includes(event.code)
      )
        return;
      event.preventDefault();
      if (event.type === "keydown") keys.current.add(event.code);
      else keys.current.delete(event.code);
      update();
    };
    const hidden = () => {
      if (document.hidden) reset();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [root]);
  return {
    input,
    stick,
    joystick: {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
        if (!input.current.enabled || joystick.current !== null) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        joystick.current = e.pointerId;
        root.current?.focus({ preventScroll: true });
      },
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
        if (joystick.current !== e.pointerId) return;
        const r = e.currentTarget.getBoundingClientRect(),
          x = (e.clientX - r.left - r.width / 2) / 38,
          y = (e.clientY - r.top - r.height / 2) / 38,
          size = Math.max(1, Math.hypot(x, y));
        input.current.x = x / size;
        input.current.z = y / size;
        setStick({ x: (x / size) * 32, y: (y / size) * 32 });
      },
      onPointerUp: () => {
        joystick.current = null;
        input.current.x = 0;
        input.current.z = 0;
        setStick({ x: 0, y: 0 });
      },
      onPointerCancel: reset,
      onLostPointerCapture: () => {
        joystick.current = null;
        input.current.x = 0;
        input.current.z = 0;
        setStick({ x: 0, y: 0 });
      },
    },
    look: {
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
        if (
          !input.current.enabled ||
          (e.target as HTMLElement).closest(
            "button,input,select,[data-joystick]",
          )
        )
          return;
        look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        root.current?.focus({ preventScroll: true });
      },
      onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
        const last = look.current;
        if (!last || last.id !== e.pointerId) return;
        input.current.yaw -= (e.clientX - last.x) * 0.006;
        input.current.pitch = Math.max(
          0.12,
          Math.min(0.75, input.current.pitch + (e.clientY - last.y) * 0.004),
        );
        last.x = e.clientX;
        last.y = e.clientY;
      },
      onLostPointerCapture: () => {
        look.current = null;
      },
      onPointerUp: () => {
        look.current = null;
      },
      onPointerCancel: () => {
        look.current = null;
      },
    },
    reset,
  };
}
