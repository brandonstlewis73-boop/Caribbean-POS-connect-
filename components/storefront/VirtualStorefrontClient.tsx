"use client";

/* eslint-disable @next/next/no-img-element */

import { Canvas, useFrame } from "@react-three/fiber";
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCcw, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  entrance: { position: [0, 1.88, 6.65], lookAt: [0, 1.18, 0.75] },
  featured: { position: [0, 1.86, 5.35], lookAt: [0, 1.08, 1.02] },
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

function createProductLabel(product: Product, currency: string, accent: string) {
  return createCanvasTexture(640, 420, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 640, 420);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.62, "#eefafb");
    gradient.addColorStop(1, "#fff4d6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 420);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 640, 18);
    ctx.fillStyle = "#071421";
    ctx.font = "900 46px Arial";
    ctx.fillText(product.name.slice(0, 22), 38, 96);
    ctx.fillStyle = "#0f766e";
    ctx.font = "900 38px Arial";
    ctx.fillText(money(product.selling_price, currency), 38, 154);
    ctx.fillStyle = "#475569";
    ctx.font = "700 25px Arial";
    ctx.fillText((product.category || "Product").slice(0, 34), 38, 205);
    ctx.strokeStyle = "rgba(7, 20, 33, 0.15)";
    ctx.lineWidth = 4;
    ctx.strokeRect(38, 238, 226, 72);
    ctx.fillStyle = "#071421";
    ctx.font = "900 25px Arial";
    ctx.fillText("Tap to view", 72, 284);
    ctx.fillStyle = "rgba(18, 214, 223, 0.18)";
    ctx.beginPath();
    ctx.arc(540, 310, 92, 0, Math.PI * 2);
    ctx.fill();
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
      <ambientLight intensity={0.92 * intensity} color="#ffffff" />
      <directionalLight castShadow position={[2.5, 6, 5]} intensity={1.4 * intensity} color="#fff7e8" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-3.2, 3.2, 2.3]} intensity={0.9 * intensity} color={theme.accent} distance={8} />
      <pointLight position={[3.2, 3.1, -1.8]} intensity={0.72 * intensity} color={theme.warm} distance={7} />
      <spotLight position={[0, 5.5, 1.5]} angle={0.48} penumbra={0.68} intensity={1.25 * intensity} color="#ffffff" castShadow />
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

function ShelfUnit({ position, rotation = [0, 0, 0], theme }: { position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple; theme: ThemeTokens }) {
  return (
    <group position={position} rotation={rotation}>
      {[0.35, 1.05, 1.75].map((height) => (
        <mesh key={height} position={[0, height, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.7, 0.12, 0.54]} />
          <meshStandardMaterial color={theme.shelf} roughness={0.42} metalness={0.18} />
        </mesh>
      ))}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 1.05, 0]} castShadow>
          <boxGeometry args={[0.12, 1.62, 0.5]} />
          <meshStandardMaterial color={theme.shelf} roughness={0.48} metalness={0.14} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[2.95, 0.16, 0.68]} />
        <meshStandardMaterial color="#dbeafe" roughness={0.55} />
      </mesh>
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

function CustomerFigure({ position, color = "#2563eb", offset = 0 }: { position: THREE.Vector3Tuple; color?: string; offset?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = position[0] + Math.sin(clock.elapsedTime * 0.55 + offset) * 0.28;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 + offset) * 0.18;
  });
  return (
    <group ref={ref} position={position}>
      <mesh castShadow position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.13, 18, 12]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, 1.06, 0]}>
        <capsuleGeometry args={[0.14, 0.42, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.48} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} castShadow position={[x, 0.48, 0]}>
          <capsuleGeometry args={[0.045, 0.46, 4, 8]} />
          <meshStandardMaterial color="#1f2937" roughness={0.55} />
        </mesh>
      ))}
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
function ProductPedestal({ x, z, theme }: { x: number; z: number; theme: ThemeTokens }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, 0.47, 0]}>
        <boxGeometry args={[1.34, 0.28, 0.72]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.32} metalness={0.06} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.66, -0.03]}>
        <boxGeometry args={[1.16, 0.08, 0.56]} />
        <meshStandardMaterial color={theme.shelf} roughness={0.38} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.7, 0.28]}>
        <boxGeometry args={[1.1, 0.045, 0.07]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.18} roughness={0.28} />
      </mesh>
    </group>
  );
}
function ProductDisplay({ product, index, currency, theme, onSelect, featured = false }: { product: Product; index: number; currency: string; theme: ThemeTokens; onSelect: (product: Product) => void; featured?: boolean }) {
  const label = useMemo(() => createProductLabel(product, currency, theme.accent), [product, currency, theme.accent]);
  const imageTexture = useImageTexture(product.image_url);
  const row = Math.floor(index / 4);
  const column = index % 4;
  const featuredColumn = index % 3;
  const featuredRow = Math.floor(index / 3);
  const side = column < 2 ? -1 : 1;
  const x = featured ? -1.45 + featuredColumn * 1.45 : side * (1.65 + (column % 2) * 1.35);
  const z = featured ? 1.35 - featuredRow * 0.94 : 2.25 - row * 1.05;
  const y = featured ? 0.98 : 1.2 + (index % 2) * 0.16;
  const rotationY = featured ? 0 : side < 0 ? Math.PI / 8 : -Math.PI / 8;
  const cardWidth = featured ? 1.22 : 1.34;
  const cardHeight = featured ? 1.18 : 1.14;
  const imageWidth = featured ? 1.08 : 1.22;
  const imageHeight = featured ? 0.74 : 0.8;
  const labelWidth = featured ? 1.08 : 1.18;
  const labelHeight = featured ? 0.38 : 0.34;
  const accentWidth = featured ? 1.12 : 1.3;
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.position.y = y + Math.sin(clock.elapsedTime * 0.9 + index) * 0.018;
  });

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      rotation={[0, rotationY, 0]}
      onClick={(event) => { event.stopPropagation(); onSelect(product); }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      <mesh position={[0, -0.62, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[featured ? 1.28 : 1.42, 0.12, featured ? 0.58 : 0.56]} />
        <meshStandardMaterial color="#d9eef0" roughness={0.5} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.1, -0.075]} castShadow>
        <boxGeometry args={[cardWidth, cardHeight, 0.09]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.18, 0.025]}>
        <planeGeometry args={[imageWidth, imageHeight]} />
        <meshStandardMaterial map={imageTexture || label} roughness={0.36} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, featured ? -0.52 : -0.38, 0.03]}>
        <planeGeometry args={[labelWidth, labelHeight]} />
        <meshStandardMaterial map={label} roughness={0.38} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, featured ? 0.96 : 0.8, 0.045]}>
        <boxGeometry args={[accentWidth, 0.035, 0.04]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.16} />
      </mesh>
    </group>
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
  const categoryCount = Math.max(1, categories.length);

  return (
    <>
      <color attach="background" args={["#edfafa"]} />
      <fog attach="fog" args={["#f8ffff", 16, 32]} />
      <StoreLighting theme={theme} mode={settings.storefront_3d_lighting} />
      <CameraRig viewpoint={viewpoint} yaw={yaw} />
      {[-2.8, 0, 2.8].map((x) => <CeilingLight key={`light-${x}`} x={x} z={-1.4} theme={theme} />)}
      {[-1.7, 1.7].map((x) => <CeilingLight key={`front-light-${x}`} x={x} z={2.35} theme={theme} />)}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[10, 13]} />
        <meshStandardMaterial color={theme.floor} roughness={0.58} metalness={0.03} />
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
      <WallPanel position={[0, 2.5, -5.4]} size={[10, 5, 0.18]} color={theme.wall} />
      <mesh position={[0, 2.5, -5.29]} receiveShadow>
        <boxGeometry args={[4.9, 3.35, 0.05]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.52} metalness={0.03} />
      </mesh>
      {[-2, -1.2, -0.4, 0.4, 1.2, 2].map((x) => (
        <mesh key={`wood-slat-${x}`} position={[x, 2.5, -5.23]}>
          <boxGeometry args={[0.07, 3.15, 0.05]} />
          <meshStandardMaterial color="#c0843e" roughness={0.5} />
        </mesh>
      ))}
      <WallPanel position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} size={[10.8, 5, 0.18]} color="#eff8f8" />
      <WallPanel position={[5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} size={[10.8, 5, 0.18]} color="#f8fbff" />
      <WallPanel position={[0, 5.04, 0]} size={[10.1, 0.16, 11]} color={theme.ceiling} />

      <mesh position={[0, 3.02, -5.17]} castShadow>
        <planeGeometry args={[4.65, 1.34]} />
        <meshStandardMaterial map={sign} roughness={0.4} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.12, -5.15]}>
        <boxGeometry args={[6.35, 0.075, 0.07]} />
        <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.82, -5.08]} receiveShadow>
        <boxGeometry args={[7.6, 1.35, 0.12]} />
        <meshStandardMaterial color="#eaf7f7" roughness={0.5} metalness={0.02} />
      </mesh>

      <ShelfUnit position={[-3.3, 0, 1.8]} rotation={[0, Math.PI / 2, 0]} theme={theme} />
      <ShelfUnit position={[3.3, 0, 1.65]} rotation={[0, -Math.PI / 2, 0]} theme={theme} />
      <ShelfUnit position={[-3.3, 0, -1.55]} rotation={[0, Math.PI / 2, 0]} theme={theme} />
      <ShelfUnit position={[3.3, 0, -1.7]} rotation={[0, -Math.PI / 2, 0]} theme={theme} />
      <StorePlant position={[-4.25, 0, 3.35]} scale={1.1} />
      <StorePlant position={[4.25, 0, 3.15]} scale={1.05} />
      <StorePlant position={[-4.18, 0, -4.15]} scale={0.9} />
      <StorePlant position={[4.18, 0, -4.0]} scale={0.9} />
      <PosterPanel position={[-2.95, 2.35, -5.08]} text="Handcrafted with love" theme={theme} />
      <PosterPanel position={[2.95, 2.35, -5.08]} text="Fresh local treats" theme={theme} />
      <CustomerFigure position={[-1.9, 0, 3.2]} color="#2563eb" offset={0.2} />
      <CustomerFigure position={[2.1, 0, 2.65]} color="#f97316" offset={1.7} />
      <CustomerFigure position={[-0.85, 0, -0.4]} color="#14b8a6" offset={2.8} />
      <CustomerFigure position={[0.86, 0, -3.36]} color="#111827" offset={0.9} />

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
      </group>

      {Array.from({ length: Math.min(5, categoryCount) }).map((_, index) => (
        <mesh key={index} position={[-2.8 + index * 1.4, 0.035, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.49, 40]} />
          <meshBasicMaterial color={index % 2 ? theme.warm : theme.accent} transparent opacity={0.24} />
        </mesh>
      ))}

      <group position={[0, 0, 1.16]}>
        <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
          <boxGeometry args={[6.45, 0.22, 1.95]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.08} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.62, -0.42]}>
          <boxGeometry args={[6.1, 0.18, 0.28]} />
          <meshStandardMaterial color={theme.shelf} roughness={0.38} metalness={0.16} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0.52, 0.78]}>
          <boxGeometry args={[6.0, 0.09, 0.16]} />
          <meshStandardMaterial color={theme.accent} emissive={theme.accent} emissiveIntensity={0.12} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.44, 0.88]}>
          <boxGeometry args={[5.95, 0.045, 0.12]} />
          <meshStandardMaterial color={theme.warm} emissive={theme.warm} emissiveIntensity={0.14} roughness={0.28} />
        </mesh>
        {[-2.75, 0, 2.75].map((x) => (
          <mesh key={x} castShadow receiveShadow position={[x, 0.09, 0]}>
            <boxGeometry args={[0.2, 0.5, 1.55]} />
            <meshStandardMaterial color={theme.counter} roughness={0.38} metalness={0.1} />
          </mesh>
        ))}
      </group>

      {products.slice(0, 3).map((product, index) => <ProductPedestal key={`pedestal-${product.id}`} x={-1.45 + index * 1.45} z={1.35} theme={theme} />)}
      {products.slice(0, 6).map((product, index) => <ProductDisplay key={product.id} product={product} index={index} currency={settings.currency} theme={theme} onSelect={onSelect} featured />)}
      {products.slice(6).map((product, index) => <ProductDisplay key={product.id} product={product} index={index + 6} currency={settings.currency} theme={theme} onSelect={onSelect} />)}

      <Hotspot label="Featured" position={[-2.9, 0.2, 3.1]} theme={theme} onClick={() => onViewpoint("featured")} />
      <Hotspot label="Categories" position={[2.8, 0.2, 2.8]} theme={theme} onClick={() => onViewpoint("categories")} />
      <Hotspot label="Checkout" position={[0, 0.2, -2.85]} theme={theme} onClick={() => onViewpoint("checkout")} />
    </>
  );
}

function StoreHUD({ settings, productCount, onExit }: { settings: Settings; productCount: number; onExit: () => void }) {
  const businessName = safeBusinessName(settings);
  return (
    <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-3 text-slate-950 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm sm:h-12 sm:w-12" />
        <div className="min-w-0">
          <p className="truncate text-base font-black sm:text-lg">{businessName}</p>
          <p className="truncate text-xs font-bold text-slate-500">Virtual storefront - tap shelf products</p>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:shrink-0">
        <Badge tone="green">{productCount} live products</Badge>
        <Button type="button" size="sm" onClick={onExit} className="min-w-max rounded-full border-slate-200 bg-white px-4 text-slate-800 hover:border-teal-300 hover:bg-teal-50">Shop Normally</Button>
      </div>
    </div>
  );
}

function StoreControls({ viewpoint, onViewpoint, yaw, onYaw, onReset }: { viewpoint: Viewpoint; onViewpoint: (viewpoint: Viewpoint) => void; yaw: number; onYaw: (next: number) => void; onReset: () => void }) {
  const buttonClass = "grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-white/90 text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50 sm:h-11 sm:w-11";
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 grid gap-2 sm:inset-x-5 sm:bottom-5 sm:gap-3">
      <div className="pointer-events-auto mx-auto grid w-full max-w-[calc(100vw-1.5rem)] grid-cols-4 gap-1 rounded-2xl border border-white/35 bg-slate-950/78 p-1.5 text-white shadow-2xl backdrop-blur-xl sm:flex sm:w-auto sm:max-w-full sm:gap-2 sm:rounded-full sm:p-2">
        {(["entrance", "featured", "categories", "checkout"] as Viewpoint[]).map((target) => (
          <button key={target} type="button" onClick={() => onViewpoint(target)} className={`min-h-9 min-w-0 truncate rounded-full px-2 text-[11px] font-black capitalize transition sm:min-h-10 sm:whitespace-nowrap sm:px-4 sm:text-xs ${viewpoint === target ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-white hover:bg-white/18"}`}>
            {target === "entrance" ? "Home" : target === "categories" ? "Aisles" : target}
          </button>
        ))}
      </div>
      <div className="pointer-events-auto mx-auto flex items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => onYaw(Math.max(-0.75, yaw - 0.18))} aria-label="Look left"><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" className={buttonClass} onClick={onReset} aria-label="Reset view"><RotateCcw className="h-4 w-4" /></button>
        <button type="button" className={buttonClass} onClick={() => onYaw(Math.min(0.75, yaw + 0.18))} aria-label="Look right"><ArrowRight className="h-4 w-4" /></button>
      </div>
      <p className="mx-auto max-w-[calc(100vw-2rem)] rounded-full bg-white/85 px-3 py-1 text-center text-[11px] font-bold text-slate-600 shadow-sm sm:text-xs">Drag to look around. Tap shelf products.</p>
    </div>
  );
}

function ProductModal({ product, category, settings, onClose, onAddToCart }: { product: Product; category: string; settings: Settings; onClose: () => void; onAddToCart: (product: Product) => void }) {
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

export default function VirtualStorefrontClient({ products, categories, settings, onAddToCart, onExit }: Props) {
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
    <section className="grid gap-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:rounded-[34px] sm:p-4">
      <StoreHUD settings={settings} productCount={visibleProducts.length} onExit={onExit} />
      <div
        className="relative h-[560px] touch-pan-y overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-amber-50 shadow-inner sm:h-[680px] sm:rounded-[32px]"
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
        <StoreControls viewpoint={viewpoint} onViewpoint={setViewpoint} yaw={yaw} onYaw={setYaw} onReset={resetView} />
      </div>
      <div className="grid gap-2 text-slate-700 sm:grid-cols-3">
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold leading-5 sm:text-sm">Tap a product display for details and quantity.</p>
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold leading-5 sm:text-sm">Drag the store or use the view buttons.</p>
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold leading-5 sm:text-sm">Checkout stays in the normal store flow.</p>
      </div>
      {selectedProduct ? (
        <ProductModal
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
