"use client";
/* eslint-disable @next/next/no-img-element */
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Settings2,
  X,
  Volume2,
  RotateCcw,
  Footprints,
  Search,
  Maximize,
  Leaf,
} from "lucide-react";
import { money } from "@/lib/constants";
import { availableSaleStock, saleUnitPrice } from "@/lib/pos-checkout";
import {
  PAGE_SIZE,
  productPlacements,
  worldConfig,
} from "@/lib/immersive/world";
import type { Product, Settings } from "@/lib/types";
import { useControls } from "./useControls";
import { StoreAudio } from "./audio";
import type { Quality, SceneStats } from "./Scene";
import styles from "./ImmersiveStorefront.module.css";
const Scene = dynamic(() => import("./Scene"), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Panel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current,
      previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.panel}
      aria-label={title}
      onCancel={onClose}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
type Props = {
  products: Product[];
  settings: Settings;
  cartQuantities: Record<string, number>;
  cartCount: number;
  cartSubtotal: number;
  canShop: boolean;
  onAddToCart: (p: Product, q?: number) => void;
  onExit: () => void;
  onViewCart: () => void;
};
export default function ImmersiveStorefront(props: Props) {
  const root = useRef<HTMLDivElement>(null),
    audio = useRef<StoreAudio | null>(null);
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState(0),
    [fault, setFault] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [panel, setPanel] = useState<"products" | "settings" | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [nearby, setNearby] = useState<string | null>(null),
    [page, setPage] = useState(0),
    [search, setSearch] = useState("");
  const [quality, setQuality] = useState<Quality>("auto"),
    [autoLow, setAutoLow] = useState(false),
    [sound, setSound] = useState(false),
    [music, setMusic] = useState(false),
    [status, setStatus] = useState(""),
    [quantity, setQuantity] = useState(1);
  const [stats, setStats] = useState<SceneStats>({
    fps: 0,
    calls: 0,
    triangles: 0,
    x: 0,
    z: 0,
    speed: 0,
  });
  const slowSamples = useRef(0),
    openRef = useRef<(id: string | null) => void>(() => {});
  const controls = useControls(root, ready && !panel && !selected && !fault);
  const config = useMemo(() => worldConfig(props.settings), [props.settings]);
  const products = useMemo(
    () => props.products.filter((p) => p.active !== false),
    [props.products],
  );
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE)),
    currentPage = Math.min(page, pageCount - 1);
  const placements = useMemo(
    () => productPlacements(products, currentPage),
    [products, currentPage],
  );
  const selectedProduct = products.find((p) => p.id === selected),
    nearProduct = products.find((p) => p.id === nearby);
  const remaining = selectedProduct
    ? Math.max(
        0,
        availableSaleStock(selectedProduct) -
          (props.cartQuantities[selectedProduct.id] || 0),
      )
    : 0;
  const closePanel = () => {
    setPanel(null);
    setSelected(null);
    root.current?.focus({ preventScroll: true });
  };
  const checkout = () => {
    controls.reset();
    props.onViewCart();
  };
  openRef.current = (id) => {
    if (id === "checkout") checkout();
    else if (id && products.some((p) => p.id === id)) {
      setQuantity(1);
      setSelected(id);
    }
  };
  const onInteract = useCallback(
    (id: string | null) => openRef.current(id),
    [],
  );
  const onReady = useCallback(() => setReady(true), []),
    onError = useCallback(() => {
      setFault(true);
      setReady(false);
    }, []);
  const onStats = useCallback((next: SceneStats) => {
    setStats(next);
    slowSamples.current = next.fps < 28 ? slowSamples.current + 1 : 0;
    if (slowSamples.current >= 3) setAutoLow(true);
  }, []);
  useEffect(() => {
    const siblings = [...document.body.children].filter(
      (el) => el !== root.current && el instanceof HTMLElement,
    ) as HTMLElement[];
    const inertBefore = siblings.map((el) => el.inert);
    siblings.forEach((el) => {
      el.inert = true;
    });
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const pref = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (pref.matches) props.onExit();
    const change = () => {
      if (pref.matches) props.onExit();
    };
    pref.addEventListener("change", change);
    setAutoLow(
      window.innerWidth < 700 ||
        ((navigator as Navigator & { deviceMemory?: number }).deviceMemory !==
          undefined &&
          Number(
            (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
          ) <= 4),
    );
    const canvas = document.createElement("canvas");
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2");
    } catch {}
    if (!gl) setFault(true);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return () => {
      siblings.forEach((el, i) => {
        el.inert = inertBefore[i];
      });
      document.body.style.overflow = overflow;
      previous?.focus();
      pref.removeEventListener("change", change);
      audio.current?.dispose();
    };
    // Mount-only lifecycle: parent callbacks intentionally reflect current cart state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 5000);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (ready || fault) return;
    const timer = setTimeout(() => setFault(true), 25000);
    return () => clearTimeout(timer);
  }, [ready, fault, attempt]);
  useEffect(() => {
    if (panel || selected || !ready) audio.current?.suspend();
    else if (sound) audio.current?.resume();
  }, [panel, selected, ready, sound]);
  useEffect(() => {
    const change = () => {
      if (document.hidden) audio.current?.suspend();
      else if (sound && !panel && !selected) audio.current?.resume();
    };
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, [sound, panel, selected]);
  async function toggleSound() {
    try {
      if (sound) {
        audio.current?.suspend();
        setSound(false);
        return;
      }
      audio.current ||= new StoreAudio();
      await audio.current.enable();
      setSound(true);
    } catch {
      setStatus("Sound is unavailable in this browser.");
    }
  }
  function add() {
    if (
      !selectedProduct ||
      !props.canShop ||
      quantity < 1 ||
      quantity > remaining
    )
      return;
    props.onAddToCart(selectedProduct, quantity);
    controls.input.current.pickup++;
    audio.current?.tone(660, 0.13, 0.1);
    setStatus(`${quantity} × ${selectedProduct.name} added to your bag.`);
    setSelected(null);
    root.current?.focus({ preventScroll: true });
  }
  const format = (amount: number) => money(amount, props.settings.currency);
  return createPortal(
    <div
      ref={root}
      className={styles.engine}
      tabIndex={0}
      role="region"
      aria-label={`${config.name} immersive store`}
      data-ready={ready}
      data-player-x={stats.x.toFixed(2)}
      data-player-z={stats.z.toFixed(2)}
      data-fps={stats.fps}
      data-draw-calls={stats.calls}
      data-triangles={stats.triangles}
    >
      <div className={styles.viewport} {...controls.look}>
        {!fault ? (
          <SceneBoundary key={attempt} onError={onError}>
            <Scene
              config={config}
              placements={placements}
              currency={props.settings.currency}
              input={controls.input}
              audio={audio}
              nearby={nearby}
              low={quality === "low" || (quality === "auto" && autoLow)}
              onReady={onReady}
              onProgress={setProgress}
              onError={onError}
              onNearby={setNearby}
              onInteract={onInteract}
              onStats={onStats}
            />
          </SceneBoundary>
        ) : null}
      </div>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          {props.settings.logo_url ? (
            <img src={props.settings.logo_url} alt="" />
          ) : (
            <Leaf size={24} />
          )}
          <h1>{config.name}</h1>
        </div>
        <nav aria-label="Store controls">
          <button type="button" onClick={props.onExit}>
            <ArrowLeft size={18} />
            <span>Quick Shop</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("settings")}
            aria-label="Store settings"
          >
            <Settings2 size={20} />
          </button>
        </nav>
      </header>
      {ready && !fault ? (
        <>
          <div className={styles.collection}>
            <button type="button" onClick={() => setPanel("products")}>
              <Search size={17} />
              Browse products
            </button>
            {pageCount > 1 ? (
              <div>
                <button
                  type="button"
                  aria-label="Previous collection"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  {currentPage + 1}/{pageCount}
                </span>
                <button
                  type="button"
                  aria-label="Next collection"
                  disabled={currentPage === pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
          <div className={styles.location}>
            <span>
              {nearby === "checkout"
                ? "Checkout counter"
                : nearProduct
                  ? nearProduct.name
                  : "Explore the store"}
            </span>
            <small>
              {nearProduct
                ? format(saleUnitPrice(nearProduct))
                : "Walk towards a shelf to inspect products"}
            </small>
          </div>
          {nearby ? (
            <button
              type="button"
              className={styles.prompt}
              onClick={() => onInteract(nearby)}
            >
              <kbd>E</kbd>
              {nearby === "checkout" ? "Go to checkout" : "Inspect product"}
              <ArrowRight size={18} />
            </button>
          ) : null}
          <div className={styles.desktopHint}>
            <kbd>W A S D</kbd> Move · Drag to look · Shift to run · E to inspect
          </div>
          <div
            data-joystick
            className={styles.joystick}
            aria-label="Movement joystick"
            {...controls.joystick}
          >
            <span
              style={{
                transform: `translate(${controls.stick.x}px,${controls.stick.y}px)`,
              }}
            />
            <small>MOVE</small>
          </div>
          <button
            type="button"
            className={styles.run}
            aria-label="Run"
            aria-pressed={controls.input.current.run}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              controls.input.current.run = true;
            }}
            onPointerUp={() => {
              controls.input.current.run = false;
            }}
            onPointerCancel={() => {
              controls.input.current.run = false;
            }}
            onLostPointerCapture={() => {
              controls.input.current.run = false;
            }}
          >
            <Footprints size={23} />
          </button>
          <button type="button" className={styles.bag} onClick={checkout}>
            <ShoppingBag size={21} />
            <span>
              Bag <b>{props.cartCount}</b>
              <small>{format(props.cartSubtotal)}</small>
            </span>
          </button>
        </>
      ) : null}
      {!ready && !fault ? (
        <div className={styles.cover}>
          <Leaf size={38} />
          <h2>Opening {config.name}</h2>
          <p>Preparing the store and your character</p>
          <progress
            max={100}
            value={progress}
            aria-label="Store assets loaded"
          />
          <button type="button" onClick={props.onExit}>
            Continue with Quick Shop
          </button>
        </div>
      ) : null}
      {fault ? (
        <div className={styles.cover} role="alert">
          <ShoppingBag size={38} />
          <h2>Let’s keep shopping</h2>
          <p>
            The 3D view couldn’t open on this device. Your bag is still
            available.
          </p>
          <button type="button" onClick={props.onExit}>
            Open Quick Shop
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const scene = await import("./Scene");
                scene.clearSceneAssetCache();
                setFault(false);
                setReady(false);
                setAutoLow(true);
                setAttempt((n) => n + 1);
              } catch {
                setStatus(
                  "Please use Quick Shop while the 3D view is unavailable.",
                );
              }
            }}
          >
            Retry with lighter graphics
          </button>
        </div>
      ) : null}
      <p role="status" className={status ? styles.toast : styles.srOnly}>
        {status}
      </p>
      {panel === "products" ? (
        <Panel title="Products" onClose={closePanel}>
          <label className={styles.search}>
            <Search size={19} />
            <input
              autoFocus
              type="search"
              aria-label="Search products"
              placeholder="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className={styles.productList}>
            {products
              .filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setPanel(null);
                    setQuantity(1);
                    setSelected(p.id);
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt="" loading="lazy" />
                  ) : (
                    <ShoppingBag size={24} />
                  )}
                  <span>
                    <b>{p.name}</b>
                    <small>
                      {format(saleUnitPrice(p))} ·{" "}
                      {p.stock_quantity > 0 ? "In stock" : "Sold out"}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
          </div>
        </Panel>
      ) : null}
      {selected ? (
        <Panel title="Product details" onClose={closePanel}>
          {selectedProduct ? (
            <>
              <div className={styles.productHero}>
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                  />
                ) : (
                  <ShoppingBag size={60} />
                )}
              </div>
              <div className={styles.panelBody}>
                <h3>{selectedProduct.name}</h3>
                <strong className={styles.price}>
                  {format(saleUnitPrice(selectedProduct))}
                </strong>
                <p>
                  {selectedProduct.description ||
                    "View the product details and choose your quantity."}
                </p>
                <p>
                  {remaining > 0
                    ? `${remaining} available`
                    : availableSaleStock(selectedProduct) > 0
                      ? "Already in your bag"
                      : "Sold out"}
                </p>
                <label className={styles.quantity}>
                  Quantity
                  <input
                    aria-label="Quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={Math.max(1, remaining)}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(
                          1,
                          Math.min(
                            remaining || 1,
                            Math.floor(Number(e.target.value) || 1),
                          ),
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={
                    !props.canShop || remaining < quantity || remaining === 0
                  }
                  onClick={add}
                >
                  {!props.canShop
                    ? "Ordering unavailable"
                    : remaining === 0
                      ? "No more available"
                      : `Add to bag · ${format(saleUnitPrice(selectedProduct) * quantity)}`}
                </button>
              </div>
            </>
          ) : (
            <div className={styles.panelBody}>
              <p>This product is no longer available.</p>
            </div>
          )}
        </Panel>
      ) : null}
      {panel === "settings" ? (
        <Panel title="Store settings" onClose={closePanel}>
          <div className={styles.panelBody}>
            <label className={styles.setting}>
              Graphics
              <select
                aria-label="Graphics"
                value={quality}
                onChange={(e) => setQuality(e.target.value as Quality)}
              >
                <option value="auto">Automatic</option>
                <option value="low">Battery saver</option>
                <option value="high">High detail</option>
              </select>
            </label>
            <button
              type="button"
              className={styles.setting}
              onClick={toggleSound}
            >
              <span>
                <Volume2 size={18} />
                Footsteps & shop sounds
              </span>
              <b>{sound ? "On" : "Off"}</b>
            </button>
            <label className={styles.setting}>
              Ambient music
              <input
                type="checkbox"
                checked={music}
                disabled={!sound}
                onChange={(e) => {
                  setMusic(e.target.checked);
                  audio.current?.setMusic(e.target.checked);
                }}
              />
            </label>
            <button
              type="button"
              className={styles.setting}
              onClick={() => {
                controls.input.current.reset++;
                closePanel();
              }}
            >
              <span>
                <RotateCcw size={18} />
                Return to entrance
              </span>
            </button>
            <button
              type="button"
              className={styles.setting}
              onClick={() => {
                void root.current
                  ?.requestFullscreen?.()
                  .catch(() =>
                    setStatus(
                      "Full screen is unavailable. You can keep shopping here.",
                    ),
                  );
              }}
            >
              <span>
                <Maximize size={18} />
                Full screen
              </span>
            </button>
            <p className={styles.help}>
              Move with WASD or arrow keys. Hold Shift to run. Drag the store to
              turn the camera. On a phone, move with the left joystick and drag
              the right side to look around.
            </p>
            <p className={styles.help}>
              Prefer a simpler view? Quick Shop uses the same bag and checkout.
              Reduced-motion preferences automatically select Quick Shop.
            </p>
            <details>
              <summary>Credits</summary>
              <p>Character assets: Quaternius, CC0.</p>
            </details>
          </div>
        </Panel>
      ) : null}
    </div>,
    document.body,
  );
}
