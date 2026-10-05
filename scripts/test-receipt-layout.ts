import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import QRCode from 'qrcode';
import {receiptLink,renderReceiptPdf} from '../lib/receipt-layout';
import type {Order,Settings} from '../lib/types';

async function main(){
 const dir='/tmp/caribbean-receipt-tests';await mkdir(dir,{recursive:true});
 const settings={business_name:'Baker Buds Edibles',business_phone:'+1 443 758 2368',business_email:'bakery@example.test',business_address:'San Fernando, Trinidad and Tobago',currency:'TTD',receipt_message:'Thank you for shopping at Baker Buds Edibles!'} as Settings;
 const order={id:'test-order',order_number:'1063',order_type:'delivery',created_at:'2026-10-05T00:58:22Z',customer_snapshot:{name:'Sample customer'},items:[{id:'item',quantity:11,product_name:'Triple chocolate',unit_price:60,line_total:660}],subtotal:660,discount_total:0,tax_total:0,service_fee:0,delivery_fee:25,total:685,payment_method:'Pay on delivery',payment_status:'unpaid',payment_link:'https://pay.example.com/order?order=1063',waze_link:'https://waze.com/ul?q=19%20Charles%20Court&navigate=yes'} as Order;
 assert.equal(receiptLink(order.payment_link),null);assert.equal(receiptLink('javascript:alert(1)'),null);assert.equal(receiptLink('https://user:password@pay.company.test'),null);
 const qr=await QRCode.toBuffer(order.waze_link!,{width:240,margin:4});
 const buffer=await renderReceiptPdf(order,settings,'R-4072',{navigationQr:qr});await writeFile(`${dir}/receipt.pdf`,buffer);
 const text=execFileSync('pdftotext',[`${dir}/receipt.pdf`,'-']).toString();assert.match(text,/Triple chocolate/);assert.match(text,/TT\$685\.00/);assert.match(text,/UNPAID/);assert.match(text,/ORDER RECEIPT/);assert.match(text,/DELIVERY DIRECTIONS/);assert.ok(!text.includes('pay.example.com'));assert.ok(!text.includes('https://waze'));
 const info=execFileSync('pdfinfo',[`${dir}/receipt.pdf`]).toString();assert.match(info,/Pages:\s+1/);assert.match(info,/Page size:\s+226\.77/);
 const large={...order,payment_status:'paid',items:Array.from({length:35},(_,index)=>({...order.items[0],id:String(index),product_name:`Long product name ${index} with wrapped details for receipt testing`}))} as Order;
 const long=await renderReceiptPdf(large,settings,'R-LONG',{navigationQr:qr});await writeFile(`${dir}/long.pdf`,long);
 const longText=execFileSync('pdftotext',[`${dir}/long.pdf`,'-']).toString();assert.match(longText,/name 34/);assert.match(longText,/PAYMENT RECEIPT/);assert.match(longText,/Keep this receipt/);assert.match(execFileSync('pdfinfo',[`${dir}/long.pdf`]).toString(),/Pages:\s+1/);
 const noAddress={...settings,business_address:'Location selected near 39.6, -75.7, San Fernando'};await writeFile(`${dir}/no-address.pdf`,await renderReceiptPdf({...order,waze_link:null,payment_link:null},noAddress,null));assert.ok(!execFileSync('pdftotext',[`${dir}/no-address.pdf`,'-']).toString().includes('39.6'));
 for(const template of ['modern','classic','minimal'] as const){
  const rendered=await renderReceiptPdf(order,{...settings,receipt_template:template},'R-TEMPLATE',{preview:true});await writeFile(`${dir}/${template}.pdf`,rendered);
  const content=execFileSync('pdftotext',[`${dir}/${template}.pdf`,'-']).toString();assert.match(content,/PREVIEW ONLY/);assert.match(content,/TT\$685\.00/);assert.match(content,/UNPAID/);
 }
 console.log(`PASS: totals, unpaid/paid labeling, example/unsafe URL omission, 80mm roll, long wrapped basket, footer, navigation QR. Preview: ${dir}/receipt.pdf`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
