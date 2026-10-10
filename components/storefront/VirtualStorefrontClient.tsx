"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Expand, Minus, Plus, Search, ShoppingBag, Store, CreditCard, Pause, Play, X } from "lucide-react";
import { money } from "@/lib/constants";
import { saleUnitPrice } from "@/lib/pos-checkout";
import type { Category, Product, Settings } from "@/lib/types";
import styles from "./VirtualStorefront.module.css";

type Props = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  onAddToCart: (product: Product, quantity?: number) => void;
  onExit: () => void;
  onViewCart?: () => void;
  cartQuantities?: Record<string, number>;
  cartCount?: number;
  cartSubtotal?: number;
  canShop?: boolean;
};
const POSITIONS = [{x:25,y:49},{x:46,y:56},{x:64,y:56},{x:79,y:38},{x:88,y:64},{x:42,y:78}];
const VIEWS = [
  {id:"room",name:"Full store",scale:1,origin:"50% 50%"},
  {id:"till",name:"Cashier",scale:1.45,origin:"14% 55%"},
  {id:"display",name:"Display",scale:1.65,origin:"52% 63%"},
  {id:"shelves",name:"Shelves",scale:1.65,origin:"88% 48%"}
];
const stock = (product: Product) => Math.max(0,Math.floor(Number(product.stock_quantity)||0));

function ProductSheet({product,category,settings,remaining,canShop,onClose,onAdd}: {
  product:Product;category:string;settings:Settings;remaining:number;canShop:boolean;
  onClose:()=>void;onAdd:(quantity:number)=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [quantity,setQuantity] = useState(1);
  const price = saleUnitPrice(product);
  useEffect(() => {
    const node=dialog.current;
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    node?.showModal();document.body.style.overflow="hidden";
    return () => {node?.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  const allowed=canShop && remaining>0;
  const selectedQuantity=Math.min(quantity,remaining);
  return <dialog ref={dialog} className={styles.sheet} aria-labelledby="virtual-product-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current)onClose();}}>
    <div className={styles.sheetContent}>
      <div className={styles.sheetHeader}><span>Product details</span><button autoFocus type="button" onClick={onClose} aria-label="Close product details"><X size={22}/></button></div>
      <div className={styles.productImage}>{product.image_url?<img src={product.image_url} alt={product.name} decoding="async"/>:<ShoppingBag size={56}/>}</div>
      <div className={styles.sheetBody}>
        <span className={styles.eyebrow}>{category}</span>
        <h2 id="virtual-product-title">{product.name}</h2>
        <div className={styles.priceLine}><strong>{money(price,settings.currency)}</strong>{price<Number(product.selling_price)?<del>{money(product.selling_price,settings.currency)}</del>:null}<span>{remaining>0?`${remaining} available`:stock(product)>0?"Already in your bag":"Sold out"}</span></div>
        {product.description?<p className={styles.description}>{product.description}</p>:null}
        {allowed?<div className={styles.quantity}><span>Quantity</span><div><button type="button" disabled={quantity<=1} onClick={()=>setQuantity(value=>Math.max(1,value-1))} aria-label="Decrease quantity"><Minus size={18}/></button><output aria-live="polite">{selectedQuantity}</output><button type="button" disabled={quantity>=remaining} onClick={()=>setQuantity(value=>Math.min(remaining,value+1))} aria-label="Increase quantity"><Plus size={18}/></button></div></div>:null}
      </div>
      <div className={styles.sheetFooter}><button type="button" className={styles.primary} disabled={!allowed} onClick={()=>onAdd(selectedQuantity)}><ShoppingBag size={19}/>{!canShop?"Ordering unavailable":remaining<=0?"No more available":`Add ${selectedQuantity} to bag · ${money(price*selectedQuantity,settings.currency)}`}</button><button type="button" className={styles.textButton} onClick={onClose}>Keep exploring</button></div>
    </div>
  </dialog>;
}

function CashierSheet({products,quantities,settings,subtotal,canShop,motionEnabled,onClose,onCheckout}: {products:Product[];quantities:Record<string,number>;settings:Settings;subtotal:number;canShop:boolean;motionEnabled:boolean;onClose:()=>void;onCheckout:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const counterVideo=useRef<HTMLVideoElement>(null);
  const [counterPlaying,setCounterPlaying]=useState(false);
  const [counterPaused,setCounterPaused]=useState(false);
  const [counterFailed,setCounterFailed]=useState(false);
  useEffect(()=>{const video=counterVideo.current;if(!video)return;const sync=()=>{if(motionEnabled&&!counterPaused&&!document.hidden){video.muted=true;void video.play().catch(()=>setCounterPlaying(false));}else video.pause();};sync();document.addEventListener('visibilitychange',sync);return()=>document.removeEventListener('visibilitychange',sync);},[motionEnabled,counterPaused]);
  function toggleCounter(){const video=counterVideo.current;if(!video)return;if(counterPlaying){setCounterPaused(true);video.pause();}else{setCounterPaused(false);video.muted=true;void video.play().catch(()=>setCounterPlaying(false));}}
  const items=products.filter(product=>(quantities[product.id]||0)>0);
  useEffect(()=>{const node=dialog.current;const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;node?.showModal();document.body.style.overflow="hidden";return()=>{node?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
  return <dialog ref={dialog} className={styles.sheet} aria-labelledby="cashier-title" onCancel={onClose} onClick={event=>{if(event.target===dialog.current)onClose();}}>
    <div className={styles.sheetHeader}><span>At the checkout counter</span><button autoFocus type="button" onClick={onClose} aria-label="Close cashier"><X size={22}/></button></div>
    <div className={styles.counterPreview}>
      <img src="/storefront/bakery-cashier-service.webp" className={styles.counterMedia} alt="Cashier serving a customer at the card terminal"/>
      {motionEnabled&&!counterFailed?<video ref={counterVideo} className={styles.counterMedia} src="/storefront/bakery-cashier-motion.mp4" poster="/storefront/bakery-cashier-service.webp" muted loop playsInline preload="metadata" aria-hidden="true" onPlay={()=>setCounterPlaying(true)} onPause={()=>setCounterPlaying(false)} onError={()=>{setCounterFailed(true);setCounterPlaying(false);}}/>:null}
      <span className={styles.counterLabel}>THE CHECKOUT COUNTER</span>
      {motionEnabled&&!counterFailed?<button type="button" className={styles.counterPlayback} onClick={toggleCounter} aria-label={counterPlaying?"Pause cashier animation":"Play cashier animation"}>{counterPlaying?<Pause size={18}/>:<Play size={18}/>}</button>:null}
    </div>
    <div className={styles.checkoutSteps} aria-label="Checkout steps"><span aria-current="step"><Check size={14}/>Review bag</span><ChevronRight size={14}/><span>Pickup / delivery</span><ChevronRight size={14}/><span>Payment</span></div>
    <div className={styles.sheetBody}><span className={styles.eyebrow}>{settings.business_name}</span><h2 id="cashier-title">{items.length?"Let’s check you out":"Welcome to the till"}</h2><p className={styles.description}>{items.length?"Here’s what’s in your bag. Choose pickup or delivery and your payment method in the next step.":"Choose something from the shelves first, then come back to the cashier."}</p>
    {items.length?<><ul className={styles.tillItems}>{items.map(product=><li key={product.id}><span><b>{quantities[product.id]} × {product.name}</b><small>{money(saleUnitPrice(product),settings.currency)} each</small></span><strong>{money(saleUnitPrice(product)*quantities[product.id],settings.currency)}</strong></li>)}</ul><div className={styles.tillSubtotal}><span>Subtotal</span><strong>{money(subtotal,settings.currency)}</strong></div><p className={styles.description}>Delivery and any applicable fees are calculated at checkout.</p></>:null}
    {!canShop?<p role="status" className={styles.description}>Ordering is currently unavailable.</p>:null}</div>
    <div className={styles.sheetFooter}>{items.length?<button type="button" className={styles.primary} disabled={!canShop} onClick={onCheckout}><CreditCard size={19}/>Continue to checkout<ArrowRight size={18}/></button>:null}<button type="button" className={styles.textButton} onClick={onClose}>{items.length?"Keep shopping":"Explore products"}</button></div>
  </dialog>;
}

export default function VirtualStorefront({products,categories,settings,onAddToCart,onExit,onViewCart,cartQuantities={},cartCount=0,cartSubtotal=0,canShop=true}:Props) {
  const [category,setCategory]=useState("all");
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(0);
  const [view,setView]=useState("room");
  const [selected,setSelected]=useState<Product|null>(null);
  const [message,setMessage]=useState("");
  const [atCashier,setAtCashier]=useState(false);
  const [imageFailed,setImageFailed]=useState(false);
  const sceneRef=useRef<HTMLDivElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const [motionPaused,setMotionPaused]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(true);
  const [sceneVisible,setSceneVisible]=useState(false);
  const [loadMotion,setLoadMotion]=useState(false);
  const [motionReady,setMotionReady]=useState(false);
  const [motionFailed,setMotionFailed]=useState(false);
  const [playing,setPlaying]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReducedMotion(media.matches);update();media.addEventListener('change',update);
    const node=sceneRef.current;
    const observer=window.IntersectionObserver?new IntersectionObserver(entries=>{const visible=entries[0]?.isIntersecting??false;setSceneVisible(visible);if(visible)setLoadMotion(true);}):null;
    if(node&&observer)observer.observe(node);else{setSceneVisible(true);setLoadMotion(true);}
    return()=>{media.removeEventListener('change',update);observer?.disconnect();};
  },[]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    if(sceneVisible&&!motionPaused&&!reducedMotion&&!atCashier&&!selected&&!document.hidden){video.muted=true;void video.play().catch(()=>setPlaying(false));}else video.pause();
    const visibility=()=>{if(document.hidden)video.pause();else if(sceneVisible&&!motionPaused&&!reducedMotion&&!atCashier&&!selected)void video.play().catch(()=>setPlaying(false));};
    document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);
  },[sceneVisible,motionPaused,reducedMotion,atCashier,selected,loadMotion]);
  function toggleMotion(){const video=videoRef.current;if(!video)return;if(playing){setMotionPaused(true);video.pause();}else{setMotionPaused(false);video.muted=true;void video.play().catch(()=>setPlaying(false));}}
  const rail=useRef<HTMLDivElement>(null);
  const activeProducts=useMemo(()=>products.filter(product=>product.active!==false),[products]);
  const categoryName=(product:Product)=>categories.find(entry=>entry.id===product.category_id)?.name||product.category||"Products";
  const availableCategories=categories.filter(entry=>activeProducts.some(product=>product.category_id===entry.id));
  const filtered=activeProducts.filter(product=>(category==="all"||product.category_id===category)&&`${product.name} ${categoryName(product)}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pageCount=Math.max(1,Math.ceil(filtered.length/POSITIONS.length));
  const currentPage=Math.min(page,pageCount-1);
  const displayed=filtered.slice(currentPage*POSITIONS.length,(currentPage+1)*POSITIONS.length);
  const camera=VIEWS.find(entry=>entry.id===view)||VIEWS[0];
  const selectedProduct=selected?activeProducts.find(product=>product.id===selected.id)||null:null;
  const remaining=(product:Product)=>Math.max(0,stock(product)-(cartQuantities[product.id]||0));
  const select=(product:Product)=>{setSelected(product);setMessage("");};
  function movePage(next:number){setPage(next);setView("room");rail.current?.scrollTo({left:0});}
  function add(quantity:number){if(!selectedProduct||!canShop||quantity<1||quantity>remaining(selectedProduct))return;onAddToCart(selectedProduct,quantity);setMessage(`${quantity} × ${selectedProduct.name} added to your bag.`);setSelected(null);}
  return <section className={styles.store} aria-label="Interactive store">
    <header className={styles.header}>
      <div className={styles.brand}><img src={settings.logo_url||"/caribbean-pos-connect-icon.png"} alt="" decoding="async"/><div><span className={styles.eyebrow}>THE STORE</span><h2>{settings.business_name||"Your store"}</h2></div></div>
      <button type="button" className={styles.catalogButton} onClick={onExit}><ArrowLeft size={18}/><span>View catalogue</span></button>
    </header>
    <div className={styles.sceneWrap}>
      <div className={styles.scene} ref={sceneRef}>
        <div className={styles.scenePlane} style={{transform:`scale(${camera.scale})`,transformOrigin:camera.origin}}>
          {!imageFailed?<img className={styles.sceneImage} src="/storefront/bakery-cashier-service.webp" alt="Warmly lit bakery with a cashier serving a customer at the checkout counter and shoppers browsing shelves" draggable={false} onError={()=>setImageFailed(true)} fetchPriority="high"/>:<div className={styles.sceneFallback}><Store size={48}/><span>Explore the products below</span></div>}
          {loadMotion&&!reducedMotion&&!motionFailed?<video ref={videoRef} className={`${styles.sceneVideo} ${motionReady?styles.motionReady:""}`} src="/storefront/bakery-cashier-motion.mp4" poster="/storefront/bakery-cashier-service.webp" muted loop playsInline preload="metadata" aria-hidden="true" onLoadedData={()=>setMotionReady(true)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setMotionFailed(true);setPlaying(false);}}/>:null}
          {!imageFailed?<button type="button" className={styles.cashierPin} style={{transform:`translate(-50%,-50%) scale(${1/camera.scale})`}} onClick={()=>{setView("till");setAtCashier(true);}} aria-label="Visit cashier"><CreditCard size={18}/><span>Cashier</span></button>:null}
          {!imageFailed?displayed.map((product,index)=><button type="button" key={product.id} className={styles.pin} style={{left:`${POSITIONS[index].x}%`,top:`${POSITIONS[index].y}%`,transform:`translate(-50%,-50%) scale(${1/camera.scale})`}} aria-label={`Explore ${product.name}`} onClick={()=>select(product)}><span>{index+1}</span><span className={styles.pinTooltip}>{product.name}<strong>{money(saleUnitPrice(product),settings.currency)}</strong></span></button>):null}
        </div>
        <div className={styles.sceneCaption}><span className={styles.sceneTag}>EXPLORE THE STORE</span><p>Pick a product. Make it yours.</p></div>
      </div>
      <div className={styles.sceneControls}><div role="group" aria-label="Store view">{VIEWS.map(entry=><button type="button" key={entry.id} aria-pressed={view===entry.id} onClick={()=>{setView(entry.id);if(entry.id==="till")setAtCashier(true);}}>{entry.id==="room"?<Expand size={16}/>:null}{entry.name}</button>)}</div>{!reducedMotion&&!motionFailed?<button type="button" className={styles.motionControl} onClick={toggleMotion} aria-label={playing?"Pause store animation":"Play store animation"} disabled={!loadMotion}>{playing?<Pause size={16}/>:<Play size={16}/>}<span>{playing?"Pause movement":"Play movement"}</span></button>:null}</div>
    </div>
    <div className={styles.browse}>
      <div className={styles.browseHeader}><div><span className={styles.eyebrow}>CURATED BY {settings.business_name||"YOUR STORE"}</span><h3>Find your next favourite</h3></div><label className={styles.search}><Search size={18}/><input type="search" aria-label="Search store products" placeholder="Search products" value={search} onChange={event=>{setSearch(event.target.value);movePage(0);}}/></label></div>
      <div className={styles.categories} role="group" aria-label="Product categories"><button type="button" aria-pressed={category==="all"} onClick={()=>{setCategory("all");movePage(0);}}>All products <span>{activeProducts.length}</span></button>{availableCategories.map(entry=><button type="button" key={entry.id} aria-pressed={category===entry.id} onClick={()=>{setCategory(entry.id);movePage(0);}}>{entry.name}</button>)}</div>
      <div className={styles.productRail} ref={rail} aria-label="Store products">{displayed.map((product,index)=><button type="button" className={styles.productCard} key={product.id} aria-label={`View ${product.name}`} onClick={()=>select(product)}><div className={styles.cardImage}>{product.image_url?<img src={product.image_url} alt="" loading="lazy" decoding="async"/>:<ShoppingBag size={35}/>}<span>{index+1}</span>{stock(product)===0?<span className={styles.soldOut}>Sold out</span>:null}</div><div className={styles.cardBody}><span>{categoryName(product)}</span><h4>{product.name}</h4><div><strong>{money(saleUnitPrice(product),settings.currency)}</strong><span className={styles.cardArrow}><ArrowRight size={18}/></span></div></div></button>)}</div>
      {!filtered.length?<div className={styles.empty}><ShoppingBag size={28}/><h4>{search?"No matching products":"No products in this collection"}</h4><p>{search?"Try another name or browse all products.":"Check back for the next collection."}</p>{search||category!=="all"?<button type="button" className={styles.textButton} onClick={()=>{setSearch("");setCategory("all");movePage(0);}}>Show all products</button>:null}</div>:null}
      <div className={styles.pagination}><span>{filtered.length?`${currentPage*6+1}–${Math.min((currentPage+1)*6,filtered.length)} of ${filtered.length} products`:"0 products"}<span className={styles.swipeHint}> · Swipe to explore</span></span><div><button type="button" aria-label="Previous products" disabled={currentPage===0} onClick={()=>movePage(currentPage-1)}><ChevronLeft size={20}/></button><span>{currentPage+1} / {pageCount}</span><button type="button" aria-label="Next products" disabled={currentPage>=pageCount-1} onClick={()=>movePage(currentPage+1)}><ChevronRight size={20}/></button></div></div>
    </div>
    <footer className={styles.bagBar}><div><span>{cartCount?`${cartCount} item${cartCount===1?"":"s"} in your bag`:"Your bag is waiting"}</span><strong>{money(cartSubtotal,settings.currency)}<small>subtotal</small></strong></div><button type="button" className={styles.primary} onClick={()=>{setView("till");setAtCashier(true);}}><ShoppingBag size={19}/>Visit cashier<ArrowRight size={18}/></button></footer>
    <p role="status" className={message?styles.confirmation:styles.status}>{message?<><Check size={17}/>{message}</>:null}</p>
    {atCashier?<CashierSheet products={products} quantities={cartQuantities} settings={settings} subtotal={cartSubtotal} canShop={canShop} motionEnabled={!reducedMotion&&!motionPaused} onClose={()=>{setAtCashier(false);setView("room");}} onCheckout={()=>{setAtCashier(false);(onViewCart||onExit)();}}/>:null}
    {selectedProduct?<ProductSheet key={selectedProduct.id} product={selectedProduct} category={categoryName(selectedProduct)} settings={settings} remaining={remaining(selectedProduct)} canShop={canShop} onClose={()=>setSelected(null)} onAdd={add}/>:null}
  </section>;
}
