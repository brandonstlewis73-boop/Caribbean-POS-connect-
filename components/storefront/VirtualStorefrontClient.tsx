"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Expand, Minus, Plus, Search, ShoppingBag, Store, X } from "lucide-react";
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

export default function VirtualStorefront({products,categories,settings,onAddToCart,onExit,onViewCart,cartQuantities={},cartCount=0,cartSubtotal=0,canShop=true}:Props) {
  const [category,setCategory]=useState("all");
  const [search,setSearch]=useState("");
  const [page,setPage]=useState(0);
  const [view,setView]=useState("room");
  const [selected,setSelected]=useState<Product|null>(null);
  const [message,setMessage]=useState("");
  const [imageFailed,setImageFailed]=useState(false);
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
      <div className={styles.scene}>
        <div className={styles.scenePlane} style={{transform:`scale(${camera.scale})`,transformOrigin:camera.origin}}>
          {!imageFailed?<img className={styles.sceneImage} src="/storefront/bakery-with-customers.webp" alt="Warmly lit bakery with a cashier at the till and customers browsing shelves" draggable={false} onError={()=>setImageFailed(true)} fetchPriority="high"/>:<div className={styles.sceneFallback}><Store size={48}/><span>Explore the products below</span></div>}
          {!imageFailed?displayed.map((product,index)=><button type="button" key={product.id} className={styles.pin} style={{left:`${POSITIONS[index].x}%`,top:`${POSITIONS[index].y}%`,transform:`translate(-50%,-50%) scale(${1/camera.scale})`}} aria-label={`Explore ${product.name}`} onClick={()=>select(product)}><span>{index+1}</span><span className={styles.pinTooltip}>{product.name}<strong>{money(saleUnitPrice(product),settings.currency)}</strong></span></button>):null}
        </div>
        <div className={styles.sceneCaption}><span className={styles.sceneTag}>EXPLORE THE STORE</span><p>Pick a product. Make it yours.</p></div>
      </div>
      <div className={styles.sceneControls}><div role="group" aria-label="Store view">{VIEWS.map(entry=><button type="button" key={entry.id} aria-pressed={view===entry.id} onClick={()=>setView(entry.id)}>{entry.id==="room"?<Expand size={16}/>:null}{entry.name}</button>)}</div></div>
    </div>
    <div className={styles.browse}>
      <div className={styles.browseHeader}><div><span className={styles.eyebrow}>CURATED BY {settings.business_name||"YOUR STORE"}</span><h3>Find your next favourite</h3></div><label className={styles.search}><Search size={18}/><input type="search" aria-label="Search store products" placeholder="Search products" value={search} onChange={event=>{setSearch(event.target.value);movePage(0);}}/></label></div>
      <div className={styles.categories} role="group" aria-label="Product categories"><button type="button" aria-pressed={category==="all"} onClick={()=>{setCategory("all");movePage(0);}}>All products <span>{activeProducts.length}</span></button>{availableCategories.map(entry=><button type="button" key={entry.id} aria-pressed={category===entry.id} onClick={()=>{setCategory(entry.id);movePage(0);}}>{entry.name}</button>)}</div>
      <div className={styles.productRail} ref={rail} aria-label="Store products">{displayed.map((product,index)=><button type="button" className={styles.productCard} key={product.id} aria-label={`View ${product.name}`} onClick={()=>select(product)}><div className={styles.cardImage}>{product.image_url?<img src={product.image_url} alt="" loading="lazy" decoding="async"/>:<ShoppingBag size={35}/>}<span>{index+1}</span>{stock(product)===0?<span className={styles.soldOut}>Sold out</span>:null}</div><div className={styles.cardBody}><span>{categoryName(product)}</span><h4>{product.name}</h4><div><strong>{money(saleUnitPrice(product),settings.currency)}</strong><span className={styles.cardArrow}><ArrowRight size={18}/></span></div></div></button>)}</div>
      {!filtered.length?<div className={styles.empty}><ShoppingBag size={28}/><h4>{search?"No matching products":"No products in this collection"}</h4><p>{search?"Try another name or browse all products.":"Check back for the next collection."}</p>{search||category!=="all"?<button type="button" className={styles.textButton} onClick={()=>{setSearch("");setCategory("all");movePage(0);}}>Show all products</button>:null}</div>:null}
      <div className={styles.pagination}><span>{filtered.length?`${currentPage*6+1}–${Math.min((currentPage+1)*6,filtered.length)} of ${filtered.length} products`:"0 products"}<span className={styles.swipeHint}> · Swipe to explore</span></span><div><button type="button" aria-label="Previous products" disabled={currentPage===0} onClick={()=>movePage(currentPage-1)}><ChevronLeft size={20}/></button><span>{currentPage+1} / {pageCount}</span><button type="button" aria-label="Next products" disabled={currentPage>=pageCount-1} onClick={()=>movePage(currentPage+1)}><ChevronRight size={20}/></button></div></div>
    </div>
    <footer className={styles.bagBar}><div><span>{cartCount?`${cartCount} item${cartCount===1?"":"s"} in your bag`:"Your bag is waiting"}</span><strong>{money(cartSubtotal,settings.currency)}<small>subtotal</small></strong></div><button type="button" className={styles.primary} onClick={onViewCart||onExit}><ShoppingBag size={19}/>View bag<ArrowRight size={18}/></button></footer>
    <p role="status" className={message?styles.confirmation:styles.status}>{message?<><Check size={17}/>{message}</>:null}</p>
    {selectedProduct?<ProductSheet key={selectedProduct.id} product={selectedProduct} category={categoryName(selectedProduct)} settings={settings} remaining={remaining(selectedProduct)} canShop={canShop} onClose={()=>setSelected(null)} onAdd={add}/>:null}
  </section>;
}
