import PDFDocument from 'pdfkit';
import type { Order, Settings } from './types';
import { money } from './constants';
import { receiptTemplate } from './receipt-templates';

export const RECEIPT_WIDTH = 80 * 72 / 25.4;
const MARGIN = 14;
const CONTENT = RECEIPT_WIDTH - MARGIN * 2;

export function receiptLink(value?: string | null) {
  try {
    const url = new URL(value || '');
    if (url.protocol !== 'https:' || url.username || url.password || /(^|\.)example\.(com|org|net)$/i.test(url.hostname) || url.hostname === 'localhost') return null;
    return url.toString();
  } catch { return null; }
}

type Block = {height: number; draw: (doc: PDFKit.PDFDocument, y: number) => void};
type Assets = {preview?: boolean; logo?: Buffer | null; paymentQr?: Buffer | null; navigationQr?: Buffer | null};

// Pure rendering keeps receipt totals separate from payment and order mutations.
export async function renderReceiptPdf(order: Order, settings: Settings, receiptNumber: string | null, assets: Assets = {}) {
  const template=receiptTemplate(settings.receipt_template);
  const normal=template==='classic'?'Courier':'Helvetica';
  const strong=template==='classic'?'Courier-Bold':'Helvetica-Bold';
  const measure = new PDFDocument({size:[RECEIPT_WIDTH,720],margin:MARGIN});
  measure.resume();
  const blocks: Block[] = [];
  const gap = (height: number) => blocks.push({height,draw:()=>{}});
  const rule = () => blocks.push({height:template==='minimal'?7:13,draw:(doc,y)=>{if(template==='minimal')return;doc.save().lineWidth(0.5).strokeColor('#777777');if(template==='classic')doc.dash(3,{space:2});doc.moveTo(MARGIN,y+6).lineTo(RECEIPT_WIDTH-MARGIN,y+6).stroke().restore();}});
  const text = (value: string, size = 9, bold = false, align: 'left'|'center'|'right' = 'left', space = 4) => {
    if (!value) return;
    const font = bold ? strong : normal;
    const height=measure.font(font).fontSize(size).heightOfString(value,{width:CONTENT,lineGap:2})+space;
    blocks.push({height,draw:(doc,y)=>{doc.font(font).fontSize(size).fillColor('#111111').text(value,MARGIN,y,{width:CONTENT,align,lineGap:2});}});
  };
  const pair = (label: string, value: string, size = 9, bold = false) => {
    const font=bold?strong:normal;
    const labelWidth=CONTENT*.45, valueWidth=CONTENT-labelWidth-8;
    const height=Math.max(measure.font(font).fontSize(size).heightOfString(value,{width:valueWidth,lineGap:2}),measure.heightOfString(label,{width:labelWidth,lineGap:2}))+5;
    blocks.push({height,draw:(doc,y)=>{doc.font(font).fontSize(size).fillColor('#111111').text(label,MARGIN,y,{width:labelWidth,lineGap:2});doc.text(value,MARGIN+labelWidth+8,y,{width:valueWidth,align:'right',lineGap:2});}});
  };
  if(assets.preview)text('PREVIEW ONLY · NO SALE RECORDED',8,true,'center',10);
  if(assets.logo && settings.receipt_show_logo !== false){blocks.push({height:86,draw:(doc,y)=>{try{doc.image(assets.logo!,MARGIN,y,{fit:[CONTENT,78],align:'center',valign:'center'});}catch{/* A damaged logo must not block a receipt. */}}});}
  text(settings.business_name,template==='minimal'?12:16,true,template==='minimal'?'left':'center',6);
  text([settings.business_phone,settings.business_email].filter(Boolean).join('\n'),8,false,template==='minimal'?'left':'center');
  // Automatically captured coordinate strings are not a verified business street address.
  if(settings.business_address && !/^location selected near\b/i.test(settings.business_address.trim()))text(settings.business_address,8,false,'center');
  rule();
  text(order.payment_status==='paid'?'PAYMENT RECEIPT':'ORDER RECEIPT',9,true,'center',8);
  pair('Receipt',receiptNumber||order.order_number,9,true);
  pair('Order',`#${order.order_number}`);
  const created = new Date(order.created_at);
  pair('Placed (UTC)',Number.isNaN(created.getTime())?'Not recorded':created.toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}));
  text(order.customer_snapshot.name||'Walk-in customer',10,true);
  text(order.order_type.replaceAll('_',' ').toUpperCase(),8);
  rule();
  pair('ITEM','AMOUNT',8,true);
  for(const item of order.items){
    const leftWidth=CONTENT-66;
    const title=`${item.quantity} × ${item.product_name}`;
    const amount=money(item.line_total,settings.currency);
    const nameHeight=measure.font(strong).fontSize(10).heightOfString(title,{width:leftWidth,lineGap:2});
    const amountHeight=measure.heightOfString(amount,{width:60,lineGap:2});
    const rowHeight=Math.max(nameHeight,amountHeight);
    const detail=`${money(item.unit_price,settings.currency)} each`;
    const detailHeight=measure.font(normal).fontSize(8).heightOfString(detail,{width:CONTENT});
    blocks.push({height:rowHeight+detailHeight+12,draw:(doc,y)=>{doc.font(strong).fontSize(10).text(title,MARGIN,y,{width:leftWidth,lineGap:2});doc.text(amount,MARGIN+CONTENT-60,y,{width:60,align:'right',lineGap:2});doc.font(normal).fontSize(8).fillColor('#444444').text(detail,MARGIN,y+rowHeight+3,{width:CONTENT});}});
  }
  rule();
  pair('Subtotal',money(order.subtotal,settings.currency));
  if(order.discount_total)pair('Discount',`-${money(order.discount_total,settings.currency)}`);
  if(order.tax_total)pair('Tax',money(order.tax_total,settings.currency));
  if(order.service_fee)pair('Service fee',money(order.service_fee,settings.currency));
  if(order.delivery_fee)pair('Delivery',money(order.delivery_fee,settings.currency));
  gap(6);pair('TOTAL',money(order.total,settings.currency),14,true);gap(4);rule();
  pair('Payment',order.payment_method);
  pair('Status',order.payment_status.replaceAll('_',' ').toUpperCase(),10,true);
  if(order.payment_status==='unpaid')text('Payment has not been recorded.',8,false,'center');
  const paymentLink=receiptLink(order.payment_link);
  const navigationLink=receiptLink(order.waze_link);
  const codes=[...(assets.paymentQr&&paymentLink&&order.payment_status==='unpaid'?[{buffer:assets.paymentQr,label:'SCAN TO PAY',url:paymentLink}]:[]),...(assets.navigationQr&&navigationLink?[{buffer:assets.navigationQr,label:'DELIVERY DIRECTIONS',url:navigationLink}]:[])];
  if(codes.length){rule();blocks.push({height:112,draw:(doc,y)=>{const cell=CONTENT/codes.length;codes.forEach((code,index)=>{const x=MARGIN+index*cell;doc.font(strong).fontSize(7).text(code.label,x,y,{width:cell,align:'center'});doc.image(code.buffer,x+(cell-78)/2,y+16,{width:78,height:78});doc.link(x,y+16,cell,78,code.url);});}});}
  if(order.loyalty_points_earned)text(`Loyalty earned: ${order.loyalty_points_earned} points`,8,false,'center');
  rule();text(settings.receipt_message||'Thank you for your order.',9,true,'center',6);
  text(`Keep this receipt · Order #${order.order_number}`,7,false,'center');
  measure.end();
  // Size the roll to its actual content; no empty fixed-length tail or clipped long baskets.
  const height=Math.ceil(blocks.reduce((sum,block)=>sum+block.height,0)+MARGIN*2);
  const doc=new PDFDocument({size:[RECEIPT_WIDTH,Math.max(200,height)],margin:MARGIN,info:{Title:`Receipt ${receiptNumber||order.order_number}`,Author:settings.business_name}});
  const chunks:Buffer[]=[];
  const done=new Promise<Buffer>((resolve,reject)=>{doc.on('data',chunk=>chunks.push(Buffer.from(chunk)));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  let y=MARGIN;
  for(const block of blocks){block.draw(doc,y);y+=block.height;}
  doc.end();return done;
}
