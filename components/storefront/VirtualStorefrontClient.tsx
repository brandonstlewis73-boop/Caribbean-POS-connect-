"use client";

/* eslint-disable @next/next/no-img-element */

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, RoundedBox, Text } from "@react-three/drei";
import { ArrowLeft, ArrowRight, Home, Minus, PackageOpen, Plus, RotateCcw, ShoppingBag, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { money } from "@/lib/constants";
import type { Category, Product, Settings } from "@/lib/types";

type Props = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  onAddToCart: (product: Product) => void;
  onExit: () => void;
};

type Viewpoint = "entrance" | "featured" | "categories" | "checkout";

type ThemeTokens = {
  floor: string;
  wall: string;
  ceiling: string;
  shelf: string;
  counter: string;
  accent: string;
  warm: string;
};

type DisplayVariant = "box" | "tray";

const themeAccents: Record<string, ThemeTokens> = {
  caribbean: { floor: "#e5f4f1", wall: "#f8fafc", ceiling: "#eef7f8", shelf: "#16495a", counter: "#0f3143", accent: "#12D6DF", warm: "#F5C451" },
  "modern-retail": { floor: "#edf2f7", wall: "#f8fafc", ceiling: "#f1f5f9", shelf: "#243244", counter: "#111827", accent: "#48F3F8", warm: "#F5C451" },
  cafe: { floor: "#f2e8dc", wall: "#fffaf3", ceiling: "#f8efe3", shelf: "#7c4a2d", counter: "#51301f", accent: "#14b8a6", warm: "#F5C451" },
  restaurant: { floor: "#eee7df", wall: "#fffaf4", ceiling: "#f7efe7", shelf: "#5b3b2f", counter: "#2b201c", accent: "#12D6DF", warm: "#FFD978" },
  grocery: { floor: "#e5f3e8", wall: "#f7fff8", ceiling: "#edf8ef", shelf: "#25634a", counter: "#174734", accent: "#34d399", warm: "#F5C451" },
  beauty: { floor: "#f7edf7", wall: "#fff8ff", ceiling: "#f8eef8", shelf: "#6f3f76", counter: "#4b2d50", accent: "#f0abfc", warm: "#F5C451" },
  clothing: { floor: "#edf2fb", wall: "#f8fbff", ceiling: "#eef4ff", shelf: "#2f4c7d", counter: "#1d3357", accent: "#60a5fa", warm: "#F5C451" }
};

const viewpointTargets: Record<Viewpoint, { position: THREE.Vector3Tuple; lookAt: THREE.Vector3Tuple }> = {
  entrance: { position: [0, 1.95, 6.15], lookAt: [0, 1.22, 0.55] },
  featured: { position: [0, 1.86, 4.95], lookAt: [0, 1.08, 1.02] },
  categories: { position: [2.85, 1.92, 4.25], lookAt: [2.35, 1.08, -0.1] },
  checkout: { position: [0, 2.05, 2.35], lookAt: [0, 1.08, -4.1] }
};

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function safeBusinessName(settings: Settings) {
  return (settings.business_name || "Storefront").trim() || "Storefront";
}

function themeFor(settings: Settings) {
  const selected = String(settings.storefront_3d_theme || settings.business_type || "caribbean").toLowerCase();
  const base = themeAccents[selected] || themeAccents.caribbean;
  const brand = settings.business_color && /^#?[0-9a-f]{6}$/i.test(settings.business_color)
    ? settings.business_color.startsWith("#") ? settings.business_color : `#${settings.business_color}`
    : base.accent;
  return { ...base, accent: brand };
}

function createCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createShelfLabel(product: Product, currency: string, accent: string) {
  return createCanvasTexture(560, 170, (ctx) => {
    ctx.fillStyle = "rgba(248,250,252,0.96)";
    ctx.fillRect(0, 0, 560, 170);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 560, 10);
    ctx.fillStyle = "#071421";
    ctx.font = "900 31px Arial";
    ctx.fillText(product.name.slice(0, 24), 26, 62);
    ctx.fillStyle = "#0f766e";
    ctx.font = "900 27px Arial";
    ctx.fillText(money(product.selling_price, currency), 26, 112);
    ctx.fillStyle = "rgba(7,20,33,0.58)";
    ctx.font = "800 18px Arial";
    ctx.fillText("Tap to add", 26, 146);
  });
}

function createFloorTexture(theme: ThemeTokens) {
  return createCanvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 128) {
      for (let x = 0; x < 1024; x += 128) {
        ctx.fillStyle = (x / 128 + y / 128) % 2 === 0 ? "rgba(255,255,255,0.42)" : "rgba(7,20,33,0.035)";
        ctx.fillRect(x, y, 128, 128);
      }
    }
    ctx.strokeStyle = "rgba(7,20,33,0.12)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 1024; i += 128) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }
  });
}

function createSignTexture(name: string, accent: string, logoUrl?: string | null) {
  return createCanvasTexture(1024, 360, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 1024, 360);
    gradient.addColorStop(0, "#071421");
    gradient.addColorStop(0.72, "#0B1D2E");
    gradient.addColorStop(1, "#123047");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 360);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 1024, 16);
    ctx.fillStyle = "rgba(245, 196, 81, 0.9)";
    ctx.fillRect(0, 344, 1024, 16);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(42, 48, 940, 244);
    ctx.fillStyle = "#F8FAFC";
    ctx.font = "900 66px Arial";
    ctx.textAlign = "center";
    ctx.fillText(name.slice(0, 24), 512, 156);
    ctx.fillStyle = accent;
    ctx.font = "900 28px Arial";
    ctx.fillText(logoUrl ? "Virtual storefront" : "Browse. Tap. Checkout.", 512, 218);
  });
}

function useImageTexture(url?: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    let mounted = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (loaded) => {
        if (!mounted) return;
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 4;
        setTexture(loaded);
      },
      undefined,
      () => mounted && setTexture(null)
    );
    return () => {
      mounted = false;
    };
  }, [url]);
  return texture;
}

function StoreLighting({ theme, mode }: { theme: ThemeTokens; mode?: string | null }) {
  const intensity = mode === "bright" ? 1.22 : mode === "evening" ? 0.82 : mode === "gallery" ? 1.08 : 1;
  return (
    <>
      <ambientLight intensity={0.46 * intensity} color="#fff4df" />
      <directionalLight castShadow position={[2.8, 6.4, 5.4]} intensity={1.15 * intensity} color="#fff0d2" shadow-mapSize-width={1536} shadow-mapSize-height={1536} />
      <pointLight position={[-3.4, 2.4, 2.15]} intensity={0.82 * intensity} color={theme.accent} distance={5.6} />
      <pointLight position={[3.4, 2.7, -1.8]} intensity={0.78 * intensity} color={theme.warm} distance={5.4} />
      <spotLight position={[0, 5.4, 0.55]} angle={0.42} penumbra={0.72} intensity={1.65 * intensity} color="#fff8e8" castShadow />
      <spotLight position={[0, 4.8, -3.7]} angle={0.38} penumbra={0.62} intensity={1.1 * intensity} color={theme.warm} castShadow />
    </>
  );
}

function CameraRig({ viewpoint, yaw }: { viewpoint: Viewpoint; yaw: number }) {
  const lookTarget = useRef(new THREE.Vector3(...viewpointTargets.entrance.lookAt));
  useFrame(({ camera }) => {
    const target = viewpointTargets[viewpoint];
    const targetPosition = new THREE.Vector3(target.position[0] + Math.sin(yaw) * 0.8, target.position[1], target.position[2]);
    const targetLook = new THREE.Vector3(target.lookAt[0] + Math.sin(yaw) * 0.7, target.lookAt[1], target.lookAt[2]);
    camera.position.lerp(targetPosition, 0.065);
    lookTarget.current.lerp(targetLook, 0.075);
    camera.lookAt(lookTarget.current);
  });
  return null;
}

function WallPanel({ position, rotation = [0, 0, 0], size, color }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; size: THREE.Vector3Tuple; color: string }) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.62} metalness={0.02} />
    </mesh>
  );
}

function StoreShelf({ position, rotation = [0, 0, 0], theme }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; theme: ThemeTokens }) {
  return (
    <group position={position} rotation={rotation}>
      {[0.35, 1.05, 1.75].map((height) => (
        <RoundedBox key={height} args={[2.7, 0.12, 0.54]} radius={0.035} smoothness={8} position={[0, height, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={theme.shelf} roughness={0.42} metalness={0.18} />
        </RoundedBox>
      ))}
      {[-1.25, 1.25].map((x) => (
        <RoundedBox key={x} args={[0.12, 1.62, 0.5]} radius={0.025} smoothness={8} position={[x, 1.05, 0]} castShadow>
          <meshStandardMaterial color={theme.shelf} roughness={0.48} metalness={0.14} />
        </RoundedBox>
      ))}
      <RoundedBox args={[2.95, 0.16, 0.68]} radius={0.04} smoothness={8} position={[0, 0.16, 0]} receiveShadow>
        <meshStandardMaterial color="#f6ead8" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 1.55, 0.31]}>
        <boxGeometry args={[2.48, 0.035, 0.035]} />
        <meshStandardMaterial color={theme.warm} emissive={theme.warm} emissiveIntensity={0.18} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.96, 0.31]}>
        <boxGeometry args={[2.48, 0.035, 0.035]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.24} roughness={0.24} />
      </mesh>
      <Text position={[0, 2.08, 0.31]} fontSize={0.11} maxWidth={2.25} textAlign="center" anchorX="center" anchorY="middle" color="#f8fafc">
        Browse shelf
      </Text>
    </group>
  );
}

function StorePlant({ position, scale = 1 }: { position: THREE.Vector3Tuple; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 0.42, 18]} />
        <meshStandardMaterial color="#334155" roughness={0.58} metalness={0.12} />
      </mesh>
      {[0, 0.8, 1.6, 2.4, 3.2].map((angle) => (
        <mesh key={angle} castShadow position={[Math.cos(angle) * 0.12, 0.72, Math.sin(angle) * 0.12]} rotation={[0.7, angle, 0.2]}>
          <coneGeometry args={[0.08, 0.7, 12]} />
          <meshStandardMaterial color="#0f766e" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingLight({ x, z, theme }: { x: number; z: number; theme: ThemeTokens }) {
  return (
    <group position={[x, 4.76, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.12, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.34} metalness={0.28} />
      </mesh>
      <pointLight position={[0, -0.18, 0]} intensity={0.42} color={theme.warm} distance={4.5} />
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.12, 18, 12]} />
        <meshBasicMaterial color={theme.warm} transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function HumanFigure({
  color,
  accent = "#12D6DF",
  role = "customer",
  animated = true,
  action = "walk"
}: {
  color: string;
  accent?: string;
  role?: "customer" | "cashier";
  animated?: boolean;
  action?: "walk" | "browse" | "work";
}) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const skin = role === "cashier" ? "#9a673f" : "#a66a43";
  const pant = role === "cashier" ? "#0f172a" : "#1e293b";

  useFrame(({ clock }) => {
    const step = Math.sin(clock.elapsedTime * (role === "cashier" ? 1.6 : 3.1));
    const reach = action === "browse";
    if (leftLeg.current) leftLeg.current.rotation.x = animated && !reach ? step * 0.34 : 0.04;
    if (rightLeg.current) rightLeg.current.rotation.x = animated && !reach ? -step * 0.34 : -0.04;
    if (leftArm.current) leftArm.current.rotation.x = reach ? -1.04 + Math.sin(clock.elapsedTime * 1.7) * 0.08 : role === "cashier" ? -0.38 + Math.sin(clock.elapsedTime * 1.8) * 0.12 : -step * 0.26;
    if (rightArm.current) rightArm.current.rotation.x = reach ? -0.84 + Math.cos(clock.elapsedTime * 1.4) * 0.08 : role === "cashier" ? -0.52 + Math.cos(clock.elapsedTime * 1.5) * 0.1 : step * 0.26;
    if (torso.current) {
      torso.current.position.y = animated && !reach ? Math.abs(step) * 0.018 : Math.sin(clock.elapsedTime * 0.8) * 0.006;
      torso.current.rotation.x = reach ? -0.08 + Math.sin(clock.elapsedTime * 1.2) * 0.015 : 0;
    }
  });

  return (
    <group scale={0.72}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.46, 1]}>
        <circleGeometry args={[0.32, 36]} />
        <meshBasicMaterial color="#071421" transparent opacity={0.2} />
      </mesh>
      <group ref={torso} position={[0, 0, 0]}>
        <group ref={leftLeg} position={[-0.11, 0.5, 0]}>
          <mesh castShadow position={[0, -0.24, 0]}>
            <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
            <meshStandardMaterial color={pant} roughness={0.52} />
          </mesh>
          <mesh castShadow position={[0.02, -0.49, 0.08]} scale={[1.35, 0.45, 1]}>
            <boxGeometry args={[0.12, 0.08, 0.18]} />
            <meshStandardMaterial color="#020617" roughness={0.55} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.11, 0.5, 0]}>
          <mesh castShadow position={[0, -0.24, 0]}>
            <capsuleGeometry args={[0.055, 0.42, 6, 12]} />
            <meshStandardMaterial color={pant} roughness={0.52} />
          </mesh>
          <mesh castShadow position={[0.02, -0.49, 0.08]} scale={[1.35, 0.45, 1]}>
            <boxGeometry args={[0.12, 0.08, 0.18]} />
            <meshStandardMaterial color="#020617" roughness={0.55} />
          </mesh>
        </group>
        <RoundedBox args={[0.42, 0.58, 0.2]} radius={0.08} smoothness={8} castShadow position={[0, 0.88, 0]}>
          <meshStandardMaterial color={color} roughness={0.42} metalness={0.04} />
        </RoundedBox>
        {role === "cashier" ? (
          <RoundedBox args={[0.26, 0.3, 0.035]} radius={0.025} smoothness={6} castShadow position={[0, 0.9, 0.12]}>
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </RoundedBox>
        ) : (
          <group position={[-0.34, 0.68, 0.08]}>
            <RoundedBox args={[0.18, 0.22, 0.07]} radius={0.03} smoothness={6} castShadow>
              <meshStandardMaterial color={accent} roughness={0.4} />
            </RoundedBox>
            <mesh position={[0, 0.14, 0]} rotation={[0, 0, 0]}>
              <torusGeometry args={[0.08, 0.012, 8, 18, Math.PI]} />
              <meshStandardMaterial color="#071421" roughness={0.5} />
            </mesh>
          </group>
        )}
        <group ref={leftArm} position={[-0.28, 1.03, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.04, 0.38, 6, 12]} />
            <meshStandardMaterial color={skin} roughness={0.48} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.28, 1.03, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.04, 0.38, 6, 12]} />
            <meshStandardMaterial color={skin} roughness={0.48} />
          </mesh>
        </group>
        <mesh castShadow position={[0, 1.28, 0]}>
          <sphereGeometry args={[0.17, 24, 16]} />
          <meshStandardMaterial color={skin} roughness={0.45} />
        </mesh>
        <mesh castShadow position={[0, 1.4, -0.02]} scale={[1.05, 0.48, 0.9]}>
          <sphereGeometry args={[0.18, 24, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}

function WalkingCustomer({ position, color = "#2563eb", offset = 0 }: { position: THREE.Vector3Tuple; color?: string; offset?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.34 + offset;
    const x = position[0] + Math.sin(t) * 0.48;
    const z = position[2] + Math.cos(t * 0.9) * 0.22;
    const nextX = position[0] + Math.sin(t + 0.05) * 0.48;
    const nextZ = position[2] + Math.cos((t + 0.05) * 0.9) * 0.22;
    ref.current.position.set(x, position[1], z);
    ref.current.rotation.y = Math.atan2(nextX - x, nextZ - z);
  });
  return (
    <group ref={ref} position={position}>
      <HumanFigure color={color} />
    </group>
  );
}

function BrowsingCustomer({ position, rotation = [0, 0, 0], color = "#14b8a6" }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; color?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * 0.55) * 0.035;
    ref.current.rotation.y = rotation[1] + Math.sin(clock.elapsedTime * 0.8) * 0.045;
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <HumanFigure color={color} action="browse" animated={false} />
      <RoundedBox args={[0.22, 0.12, 0.16]} radius={0.025} smoothness={6} castShadow position={[0.28, 0.74, 0.28]}>
        <meshStandardMaterial color="#F5C451" roughness={0.42} />
      </RoundedBox>
    </group>
  );
}

function StoreCashier({ position, color = "#071421" }: { position: THREE.Vector3Tuple; color?: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = -0.08 + Math.sin(clock.elapsedTime * 0.55) * 0.08;
  });
  return (
    <group ref={ref} position={position} rotation={[0, -0.08, 0]}>
      <HumanFigure color={color} role="cashier" action="work" animated={false} />
    </group>
  );
}

function AnimatedCheckoutItems({ theme }: { theme: ThemeTokens }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = -0.38 + Math.sin(clock.elapsedTime * 0.85) * 0.22;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.04;
  });
  return (
    <group ref={ref} position={[-0.35, 1.34, 0.28]}>
      {[-0.22, 0.04, 0.28].map((x, index) => (
        <RoundedBox key={x} args={[0.2, 0.1, 0.16]} radius={0.025} smoothness={6} castShadow receiveShadow position={[x, index * 0.08, index % 2 ? 0.02 : 0]}>
          <meshStandardMaterial color={index % 2 ? theme.accent : theme.warm} roughness={0.4} metalness={0.03} />
        </RoundedBox>
      ))}
      <mesh position={[0.05, 0.2, 0.02]} rotation={[-0.22, 0, 0]}>
        <planeGeometry args={[0.5, 0.18]} />
        <meshStandardMaterial color="#ecfeff" emissive={theme.accent} emissiveIntensity={0.06} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function PosterPanel({ position, text, theme }: { position: THREE.Vector3Tuple; text: string; theme: ThemeTokens }) {
  const texture = useMemo(() => createCanvasTexture(420, 520, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 420, 520);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#e8fbfb");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 420, 520);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, 0, 420, 16);
    ctx.fillStyle = "#071421";
    ctx.font = "900 42px Arial";
    ctx.textAlign = "center";
    const words = text.split(" ");
    words.forEach((word, index) => ctx.fillText(word, 210, 190 + index * 54));
    ctx.fillStyle = "rgba(245,196,81,0.28)";
    ctx.beginPath();
    ctx.arc(330, 410, 70, 0, Math.PI * 2);
    ctx.fill();
  }), [text, theme.accent]);
  return (
    <mesh position={position}>
      <planeGeometry args={[0.78, 0.98]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.02} side={THREE.DoubleSide} />
    </mesh>
  );
}
function PackageStack({ position, theme, scale = 1 }: { position: THREE.Vector3Tuple; theme: ThemeTokens; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[0, 1, 2].map((level) => (
        <RoundedBox key={level} args={[0.38, 0.12, 0.32]} radius={0.035} smoothness={6} castShadow receiveShadow position={[(level - 1) * 0.18, level * 0.13, 0]}>
          <meshStandardMaterial color={level % 2 ? theme.accent : theme.warm} roughness={0.42} metalness={0.04} />
        </RoundedBox>
      ))}
    </group>
  );
}

function ShelfSlot({ position, rotation = [0, 0, 0], children }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; children: ReactNode }) {
  return (
    <group position={position} rotation={rotation}>
      {children}
    </group>
  );
}

function ProductDisplayUnit({
  product,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  currency,
  theme,
  onSelect,
  variant = "box"
}: {
  product: Product;
  position: THREE.Vector3Tuple;
  rotation?: THREE.Vector3Tuple;
  scale?: number;
  currency: string;
  theme: ThemeTokens;
  onSelect: (product: Product) => void;
  variant?: DisplayVariant;
}) {
  const imageTexture = useImageTexture(product.image_url);
  const label = useMemo(() => createShelfLabel(product, currency, theme.accent), [product, currency, theme.accent]);
  const productTone = useMemo(() => {
    const name = product.name.toLowerCase();
    if (name.includes("pink") || name.includes("strawberry")) return { primary: "#f43f8a", secondary: "#fbcfe8", dark: "#831843" };
    if (name.includes("chocolate") || name.includes("brownie") || name.includes("cocoa")) return { primary: "#4a2517", secondary: "#9a5b35", dark: "#24130f" };
    return { primary: theme.accent, secondary: "#dffbff", dark: "#071421" };
  }, [product.name, theme.accent]);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const lift = hovered ? 0.04 : 0;
    ref.current.position.y = position[1] + lift + Math.sin(clock.elapsedTime * 0.75 + position[0]) * 0.006;
  });

  return (
    <ShelfSlot position={position} rotation={rotation}>
      <group
        ref={ref}
        scale={scale}
        onClick={(event) => { event.stopPropagation(); onSelect(product); }}
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ""; }}
      >
        <mesh position={[0, -0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 36]} />
          <meshBasicMaterial color={hovered ? theme.accent : "#071421"} transparent opacity={hovered ? 0.24 : 0.11} />
        </mesh>
        {variant === "tray" ? (
          <>
            <RoundedBox args={[0.9, 0.12, 0.6]} radius={0.045} smoothness={8} castShadow receiveShadow position={[0, 0.05, 0]}>
              <meshStandardMaterial color={productTone.dark} roughness={0.5} metalness={0.03} />
            </RoundedBox>
            {[-0.27, 0, 0.27].map((x, index) => (
              <RoundedBox key={x} args={[0.22, 0.16, 0.28]} radius={0.035} smoothness={8} castShadow receiveShadow position={[x, 0.19 + (index % 2) * 0.03, 0.02]}>
                <meshStandardMaterial color={index % 2 ? productTone.secondary : productTone.primary} roughness={0.44} metalness={0.02} />
              </RoundedBox>
            ))}
            {imageTexture ? (
              <mesh position={[0, 0.32, 0.05]} rotation={[-0.92, 0, 0]}>
                <planeGeometry args={[0.74, 0.32]} />
                <meshStandardMaterial map={imageTexture} roughness={0.38} metalness={0.02} side={THREE.DoubleSide} />
              </mesh>
            ) : null}
          </>
        ) : (
          <>
            <RoundedBox args={[0.46, 0.55, 0.34]} radius={0.045} smoothness={8} castShadow receiveShadow position={[0, 0.22, 0]}>
              <meshStandardMaterial color={hovered ? "#ffffff" : productTone.secondary} roughness={0.34} metalness={0.04} />
            </RoundedBox>
            <mesh position={[0, 0.24, 0.175]}>
              <planeGeometry args={[0.38, 0.42]} />
              {imageTexture ? (
                <meshStandardMaterial map={imageTexture} roughness={0.38} metalness={0.02} side={THREE.DoubleSide} />
              ) : (
                <meshStandardMaterial color={productTone.primary} roughness={0.38} metalness={0.02} />
              )}
            </mesh>
            <mesh position={[0, 0.49, 0.18]}>
              <boxGeometry args={[0.42, 0.035, 0.04]} />
              <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.12} roughness={0.28} />
            </mesh>
          </>
        )}
        <mesh position={[0, variant === "tray" ? -0.08 : -0.12, variant === "tray" ? 0.36 : 0.22]} rotation={[variant === "tray" ? -0.12 : 0, 0, 0]}>
          <planeGeometry args={[0.62, 0.18]} />
          <meshStandardMaterial map={label} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        {hovered ? <pointLight position={[0, 0.55, 0.32]} color={theme.accent} intensity={0.55} distance={1.9} /> : null}
      </group>
    </ShelfSlot>
  );
}

function ProductDisplayTable({ products, currency, theme, onSelect }: { products: Product[]; currency: string; theme: ThemeTokens; onSelect: (product: Product) => void }) {
  const tableProducts = products.length ? Array.from({ length: Math.min(8, Math.max(6, products.length * 2)) }, (_, index) => products[index % products.length]) : [];
  return (
    <group position={[0, 0, 1.16]}>
      <RoundedBox args={[6.45, 0.22, 1.95]} radius={0.09} smoothness={10} castShadow receiveShadow position={[0, 0.28, 0]}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.08} />
      </RoundedBox>
      <RoundedBox args={[6.1, 0.18, 0.28]} radius={0.055} smoothness={8} castShadow receiveShadow position={[0, 0.62, -0.42]}>
        <meshStandardMaterial color={theme.shelf} roughness={0.38} metalness={0.16} />
      </RoundedBox>
      <RoundedBox args={[6.0, 0.09, 0.16]} radius={0.04} smoothness={8} castShadow receiveShadow position={[0, 0.52, 0.78]}>
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.12} roughness={0.32} />
      </RoundedBox>
      <mesh position={[0, 0.44, 0.88]}>
        <boxGeometry args={[5.95, 0.045, 0.12]} />
        <meshStandardMaterial color={theme.warm} emissive={theme.warm} emissiveIntensity={0.14} roughness={0.28} />
      </mesh>
      {[-2.75, 0, 2.75].map((x) => (
        <RoundedBox key={x} args={[0.2, 0.5, 1.55]} radius={0.05} smoothness={8} castShadow receiveShadow position={[x, 0.09, 0]}>
          <meshStandardMaterial color={theme.counter} roughness={0.38} metalness={0.1} />
        </RoundedBox>
      ))}
      {tableProducts.map((product, index) => (
        <ProductDisplayUnit
          key={`table-product-${product.id}-${index}`}
          product={product}
          position={[-2.72 + (index % 4) * 1.82, 0.78 + Math.floor(index / 4) * 0.17, index % 2 ? -0.14 : 0.42]}
          scale={1.02}
          currency={currency}
          theme={theme}
          onSelect={onSelect}
          variant={index % 2 ? "box" : "tray"}
        />
      ))}
    </group>
  );
}

function ShelfProductRun({ products, currency, theme, onSelect }: { products: Product[]; currency: string; theme: ThemeTokens; onSelect: (product: Product) => void }) {
  if (!products.length) {
    return (
      <>
        {[-3.3, 3.3].map((x, sideIndex) => (
          <group key={x} position={[x, 0, sideIndex ? 1.65 : 1.8]} rotation={[0, sideIndex ? -Math.PI / 2 : Math.PI / 2, 0]}>
            {[-0.82, 0, 0.82].map((px, index) => <PackageStack key={px} position={[px, 0.55 + index * 0.44, 0.05]} theme={theme} scale={0.82} />)}
          </group>
        ))}
      </>
    );
  }
  const shelfSlots = [
    { base: [-3.3, 0, 1.8] as THREE.Vector3Tuple, rot: [0, Math.PI / 2, 0] as THREE.Vector3Tuple },
    { base: [3.3, 0, 1.65] as THREE.Vector3Tuple, rot: [0, -Math.PI / 2, 0] as THREE.Vector3Tuple },
    { base: [-3.3, 0, -1.55] as THREE.Vector3Tuple, rot: [0, Math.PI / 2, 0] as THREE.Vector3Tuple },
    { base: [3.3, 0, -1.7] as THREE.Vector3Tuple, rot: [0, -Math.PI / 2, 0] as THREE.Vector3Tuple }
  ];
  return (
    <>
      {shelfSlots.flatMap((slot, shelfIndex) => (
        [-1.12, -0.72, -0.32, 0.12, 0.56, 0.98].map((localX, index) => {
          const product = products[(shelfIndex * 6 + index) % products.length];
          return (
            <ProductDisplayUnit
              key={`shelf-product-${shelfIndex}-${index}-${product.id}`}
              product={product}
              position={[slot.base[0] + (slot.rot[1] > 0 ? 0.02 : -0.02), 0.55 + (index % 3) * 0.55, slot.base[2] + localX]}
              rotation={slot.rot}
              scale={0.72}
              currency={currency}
              theme={theme}
              onSelect={onSelect}
              variant={index % 2 ? "box" : "tray"}
            />
          );
        })
      ))}
    </>
  );
}

function Hotspot({ label, position, theme, onClick }: { label: string; position: THREE.Vector3Tuple; theme: ThemeTokens; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.08;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <group ref={ref} name={label} position={position} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 24, 16]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.35} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.3, 32]} />
        <meshBasicMaterial color={theme.warm} transparent opacity={0.68} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <planeGeometry args={[1.12, 0.32]} />
        <meshBasicMaterial color="#071421" transparent opacity={0.78} />
      </mesh>
    </group>
  );
}

function StoreScene({ products, categories, settings, viewpoint, yaw, onSelect, onViewpoint }: { products: Product[]; categories: Category[]; settings: Settings; viewpoint: Viewpoint; yaw: number; onSelect: (product: Product) => void; onViewpoint: (viewpoint: Viewpoint) => void }) {
  const theme = useMemo(() => themeFor(settings), [settings]);
  const businessName = safeBusinessName(settings);
  const sign = useMemo(() => createSignTexture(businessName, theme.accent, settings.logo_url), [businessName, theme.accent, settings.logo_url]);
  const floorTexture = useMemo(() => createFloorTexture(theme), [theme]);
  const categoryCount = Math.max(1, categories.length);

  return (
    <>
      <color attach="background" args={["#142220"]} />
      <fog attach="fog" args={["#172520", 16, 31]} />
      <Environment preset="apartment" environmentIntensity={0.32} />
      <StoreLighting theme={theme} mode={settings.storefront_3d_lighting} />
      <CameraRig viewpoint={viewpoint} yaw={yaw} />
      {[-2.8, 0, 2.8].map((x) => <CeilingLight key={`light-${x}`} x={x} z={-1.4} theme={theme} />)}
      {[-1.7, 1.7].map((x) => <CeilingLight key={`front-light-${x}`} x={x} z={2.35} theme={theme} />)}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[10, 13]} />
        <meshStandardMaterial map={floorTexture} roughness={0.5} metalness={0.04} />
      </mesh>
      {[-3, -1.5, 0, 1.5, 3].map((x) => (
        <mesh key={`floor-x-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.012, 0]}>
          <planeGeometry args={[0.018, 11.2]} />
          <meshBasicMaterial color="#b7d8dc" transparent opacity={0.34} />
        </mesh>
      ))}
      {[-4, -2, 0, 2, 4].map((z) => (
        <mesh key={`floor-z-${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.011, z]}>
          <planeGeometry args={[8.2, 0.018]} />
          <meshBasicMaterial color="#b7d8dc" transparent opacity={0.28} />
        </mesh>
      ))}
      <WallPanel position={[0, 2.5, -5.4]} size={[10, 5, 0.18]} color="#251813" />
      <mesh position={[0, 2.55, -5.29]} receiveShadow>
        <boxGeometry args={[5.55, 3.65, 0.06]} />
        <meshStandardMaterial color="#5a341b" roughness={0.5} metalness={0.04} />
      </mesh>
      {[-2.42, -1.85, -1.28, -0.71, -0.14, 0.43, 1, 1.57, 2.14, 2.71].map((x) => (
        <mesh key={`wood-slat-${x}`} position={[x, 2.5, -5.23]}>
          <boxGeometry args={[0.08, 3.45, 0.06]} />
          <meshStandardMaterial color={x % 1 ? "#a8662d" : "#c0843e"} roughness={0.48} />
        </mesh>
      ))}
      <WallPanel position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} size={[10.8, 5, 0.18]} color="#eadcc7" />
      <WallPanel position={[5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} size={[10.8, 5, 0.18]} color="#f0e2cf" />
      <WallPanel position={[0, 5.04, 0]} size={[10.1, 0.16, 11]} color={theme.ceiling} />
      <mesh position={[-4.91, 1.05, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[10.4, 1.9, 0.08]} />
        <meshStandardMaterial color="#2b211b" roughness={0.52} metalness={0.02} />
      </mesh>
      <mesh position={[4.91, 1.05, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[10.4, 1.9, 0.08]} />
        <meshStandardMaterial color="#2b211b" roughness={0.52} metalness={0.02} />
      </mesh>
      {[-4.82, 4.82].map((x) => (
        <mesh key={`side-led-${x}`} position={[x, 1.98, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[10.0, 0.045, 0.045]} />
          <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.2} roughness={0.24} />
        </mesh>
      ))}

      <mesh position={[0, 3.02, -5.17]} castShadow>
        <planeGeometry args={[4.65, 1.34]} />
        <meshStandardMaterial map={sign} roughness={0.4} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <Text
        position={[0, 3.16, -5.03]}
        fontSize={0.32}
        maxWidth={4.1}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#ffffff"
        outlineWidth={0.01}
        outlineColor="#071421"
      >
        {businessName.slice(0, 24)}
      </Text>
      <Text
        position={[0, 2.77, -5.02]}
        fontSize={0.12}
        maxWidth={3.4}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color={theme.accent}
      >
        Premium virtual storefront
      </Text>
      <mesh position={[0, 2.12, -5.15]}>
        <boxGeometry args={[6.35, 0.075, 0.07]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.82, -5.08]} receiveShadow>
        <boxGeometry args={[7.6, 1.35, 0.12]} />
        <meshStandardMaterial color="#eaf7f7" roughness={0.5} metalness={0.02} />
      </mesh>

      <StoreShelf position={[-3.3, 0, 1.8]} rotation={[0, Math.PI / 2, 0]} theme={theme} />
      <StoreShelf position={[3.3, 0, 1.65]} rotation={[0, -Math.PI / 2, 0]} theme={theme} />
      <StoreShelf position={[-3.3, 0, -1.55]} rotation={[0, Math.PI / 2, 0]} theme={theme} />
      <StoreShelf position={[3.3, 0, -1.7]} rotation={[0, -Math.PI / 2, 0]} theme={theme} />
      <StorePlant position={[-4.25, 0, 3.35]} scale={1.1} />
      <StorePlant position={[4.25, 0, 3.15]} scale={1.05} />
      <StorePlant position={[-4.18, 0, -4.15]} scale={0.9} />
      <StorePlant position={[4.18, 0, -4.0]} scale={0.9} />
      <PosterPanel position={[-2.95, 2.35, -5.08]} text="Handcrafted with love" theme={theme} />
      <PosterPanel position={[2.95, 2.35, -5.08]} text="Fresh local treats" theme={theme} />
      <WalkingCustomer position={[-2.1, 0, 3.1]} color="#2563eb" offset={0.2} />
      <WalkingCustomer position={[2.15, 0, 2.55]} color="#f97316" offset={1.7} />
      <BrowsingCustomer position={[-2.9, 0, 0.1]} rotation={[0, Math.PI / 2.35, 0]} color="#14b8a6" />
      <StoreCashier position={[0.92, 0, -4.02]} color="#111827" />

      <group position={[0, 0, -3.85]}>
        <mesh castShadow receiveShadow position={[0, 0.58, 0]}>
          <boxGeometry args={[3.55, 1.08, 0.9]} />
          <meshStandardMaterial color={theme.counter} roughness={0.34} metalness={0.16} />
        </mesh>
        <mesh position={[0, 1.18, 0.05]} castShadow>
          <boxGeometry args={[3.85, 0.16, 1.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.28} metalness={0.08} />
        </mesh>
        <mesh position={[0, 0.62, 0.47]}>
          <boxGeometry args={[2.15, 0.12, 0.035]} />
          <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.22} />
        </mesh>
        <mesh position={[-1.2, 1.34, 0.16]} castShadow>
          <boxGeometry args={[0.66, 0.18, 0.34]} />
          <meshStandardMaterial color="#071421" roughness={0.34} metalness={0.18} />
        </mesh>
        <mesh position={[-1.2, 1.48, 0.08]} rotation={[-0.28, 0, 0]}>
          <planeGeometry args={[0.55, 0.28]} />
          <meshStandardMaterial color="#dffbff" emissive={theme.accent} emissiveIntensity={0.09} roughness={0.35} />
        </mesh>
        <AnimatedCheckoutItems theme={theme} />
      </group>

      {Array.from({ length: Math.min(5, categoryCount) }).map((_, index) => (
        <mesh key={index} position={[-2.8 + index * 1.4, 0.035, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.49, 40]} />
          <meshBasicMaterial color={index % 2 ? theme.warm : theme.accent} transparent opacity={0.24} />
        </mesh>
      ))}

      <ProductDisplayTable products={products} currency={settings.currency} theme={theme} onSelect={onSelect} />
      <ShelfProductRun products={products} currency={settings.currency} theme={theme} onSelect={onSelect} />
      <ContactShadows position={[0, 0.025, 0.2]} opacity={0.52} scale={9.5} blur={2.35} far={5.5} color="#071421" />

      <Hotspot label="Featured" position={[-2.9, 0.2, 3.1]} theme={theme} onClick={() => onViewpoint("featured")} />
      <Hotspot label="Categories" position={[2.8, 0.2, 2.8]} theme={theme} onClick={() => onViewpoint("categories")} />
      <Hotspot label="Checkout" position={[0, 0.2, -2.85]} theme={theme} onClick={() => onViewpoint("checkout")} />
    </>
  );
}

function StoreHUD({ settings, productCount, onExit }: { settings: Settings; productCount: number; onExit: () => void }) {
  const businessName = safeBusinessName(settings);
  return (
    <div className="grid gap-2 rounded-[20px] border border-slate-200 bg-white p-2.5 text-slate-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:rounded-[24px] sm:p-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-10 w-10 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm sm:h-12 sm:w-12" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black sm:text-lg">{businessName}</p>
          <p className="truncate text-[11px] font-bold text-slate-500 sm:text-xs">3D storefront - tap shelf products</p>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:shrink-0">
        <Badge tone="green">{productCount} live products</Badge>
        <Button type="button" size="sm" onClick={onExit} className="min-w-max rounded-full border-slate-200 bg-white px-3 text-xs text-slate-800 hover:border-teal-300 hover:bg-teal-50 sm:px-4 sm:text-sm">Shop Normally</Button>
      </div>
    </div>
  );
}

function StoreNavigationControls({ viewpoint, onViewpoint, yaw, onYaw, onReset }: { viewpoint: Viewpoint; onViewpoint: (viewpoint: Viewpoint) => void; yaw: number; onYaw: (next: number) => void; onReset: () => void }) {
  const buttonClass = "grid h-8 w-8 place-items-center rounded-full border border-white/35 bg-white/90 text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50 sm:h-10 sm:w-10";
  const navItems: Array<{ target: Viewpoint; label: string; icon: typeof Home }> = [
    { target: "entrance", label: "Home", icon: Home },
    { target: "featured", label: "Featured", icon: Sparkles },
    { target: "categories", label: "Aisles", icon: PackageOpen },
    { target: "checkout", label: "Cart", icon: ShoppingBag }
  ];
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 grid gap-1.5 sm:inset-x-5 sm:bottom-5 sm:gap-3">
      <div className="pointer-events-auto mx-auto grid w-full max-w-[calc(100vw-1rem)] grid-cols-4 gap-1 rounded-[18px] border border-white/45 bg-slate-950/86 p-1 text-white shadow-2xl shadow-slate-950/25 backdrop-blur-xl sm:flex sm:w-auto sm:max-w-full sm:gap-2 sm:rounded-full sm:p-2">
        {navItems.map(({ target, label, icon: Icon }) => (
          <button key={target} type="button" onClick={() => onViewpoint(target)} className={`flex min-h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-[10px] font-black leading-none transition sm:min-h-10 sm:flex-row sm:gap-1.5 sm:whitespace-nowrap sm:rounded-full sm:px-4 sm:text-xs ${viewpoint === target ? "bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-900/25" : "bg-white/10 text-white hover:bg-white/18"}`}>
            <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
      <div className="pointer-events-auto mx-auto flex items-center gap-1.5 sm:gap-2">
        <button type="button" className={buttonClass} onClick={() => onYaw(Math.max(-0.75, yaw - 0.18))} aria-label="Look left"><ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
        <button type="button" className={buttonClass} onClick={onReset} aria-label="Reset view"><RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
        <button type="button" className={buttonClass} onClick={() => onYaw(Math.min(0.75, yaw + 0.18))} aria-label="Look right"><ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>
      </div>
      <p className="mx-auto max-w-[calc(100vw-1.5rem)] rounded-full bg-white/88 px-2.5 py-1 text-center text-[10px] font-bold text-slate-600 shadow-sm sm:px-3 sm:text-xs">Drag to look. Tap products.</p>
    </div>
  );
}

function ProductDetailModal({ product, category, settings, onClose, onAddToCart }: { product: Product; category: string; settings: Settings; onClose: () => void; onAddToCart: (product: Product) => void }) {
  const [quantity, setQuantity] = useState(1);
  const addQuantity = useCallback(() => {
    for (let index = 0; index < quantity; index += 1) onAddToCart(product);
    onClose();
  }, [onAddToCart, onClose, product, quantity]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/62 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
        <div className="relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-56 w-full object-cover sm:h-64" />
          ) : (
            <div className="grid h-52 place-items-center bg-gradient-to-br from-teal-50 via-white to-amber-50 text-teal-700">
              <ShoppingBag className="h-14 w-14" />
            </div>
          )}
          <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-slate-800 shadow-lg" aria-label="Close product details"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">{category}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{product.name}</h3>
            <p className="mt-2 text-2xl font-black text-teal-700">{money(product.selling_price, settings.currency)}</p>
            {product.description ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{product.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-black text-slate-700">Quantity</span>
            <div className="flex items-center rounded-full border border-slate-200 bg-white">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center text-slate-600" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="grid h-10 w-10 place-items-center text-sm font-black text-slate-950">{quantity}</span>
              <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="grid h-10 w-10 place-items-center text-slate-600" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={onClose} className="rounded-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50">Keep browsing</Button>
            <Button type="button" variant="primary" onClick={addQuantity} className="rounded-full bg-slate-950 text-white hover:bg-teal-700">Add to cart</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VirtualStore3D({ products, categories, settings, onAddToCart, onExit }: Props) {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewpoint, setViewpoint] = useState<Viewpoint>("entrance");
  const [yaw, setYaw] = useState(0);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const visibleProducts = useMemo(() => products.filter((product) => product.active !== false).slice(0, 24), [products]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const businessName = safeBusinessName(settings);

  useEffect(() => setWebglReady(supportsWebGL()), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") setYaw((value) => Math.max(-0.75, value - 0.14));
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") setYaw((value) => Math.min(0.75, value + 0.14));
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") setViewpoint("featured");
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") setViewpoint("entrance");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const resetView = useCallback(() => {
    setViewpoint("entrance");
    setYaw(0);
  }, []);

  if (webglReady === false) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-sm">
        <p className="text-lg font-black text-slate-950">3D Store is unavailable on this browser.</p>
        <p className="mt-2 text-sm font-semibold text-slate-500">You can still shop normally with the standard storefront.</p>
        <Button type="button" onClick={onExit} className="mt-4">Shop Normally</Button>
      </section>
    );
  }

  return (
    <section className="grid gap-2 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10 sm:gap-3 sm:rounded-[34px] sm:p-4">
      <StoreHUD settings={settings} productCount={visibleProducts.length} onExit={onExit} />
      <div
        className="relative h-[500px] touch-pan-y overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-amber-50 shadow-inner min-[430px]:h-[540px] sm:h-[680px] sm:rounded-[32px]"
        onPointerDown={(event) => { drag.current = { x: event.clientX, yaw }; }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const delta = (event.clientX - drag.current.x) / 360;
          setYaw(Math.max(-0.75, Math.min(0.75, drag.current.yaw + delta)));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {webglReady === null ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-[#f8fafc] text-center text-slate-950">
            <div>
              <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="mx-auto h-16 w-16 rounded-3xl bg-white object-contain p-2 shadow-sm" />
              <p className="mt-4 text-lg font-black">Loading 3D Storefront...</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">{businessName}</p>
            </div>
          </div>
        ) : null}
        <Canvas shadows camera={{ position: viewpointTargets.entrance.position, fov: 54 }} dpr={[1, 1.6]} performance={{ min: 0.55 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <StoreScene products={visibleProducts} categories={categories} settings={settings} viewpoint={viewpoint} yaw={yaw} onSelect={setSelectedProduct} onViewpoint={setViewpoint} />
        </Canvas>
        {!visibleProducts.length ? (
          <div className="absolute inset-x-4 top-28 z-20 mx-auto max-w-md rounded-[26px] border border-slate-200 bg-white/92 p-5 text-center shadow-xl backdrop-blur-xl">
            <ShoppingBag className="mx-auto h-8 w-8 text-teal-700" />
            <p className="mt-3 text-lg font-black text-slate-950">No products added yet.</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">This business has not published live products for the 3D storefront.</p>
          </div>
        ) : null}
        <StoreNavigationControls viewpoint={viewpoint} onViewpoint={setViewpoint} yaw={yaw} onYaw={setYaw} onReset={resetView} />
      </div>
      <p className="mx-auto max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[11px] font-bold leading-5 text-slate-600 sm:text-xs">Tap a shelf product for details, choose quantity, then add to cart.</p>
      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          category={categoryNameById.get(selectedProduct.category_id || "") || selectedProduct.category || "Product"}
          settings={settings}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={onAddToCart}
        />
      ) : null}
    </section>
  );
}
