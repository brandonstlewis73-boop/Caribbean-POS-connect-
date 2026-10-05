/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3040';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const qr=await require('qrcode').toDataURL('TEST-01',{width:400,margin:4});
 await page.addInitScript(qr=>{
  Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});
  navigator.mediaDevices.getUserMedia=async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const ctx=canvas.getContext('2d');const image=new Image();image.src=qr;await image.decode();
   const draw=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,640,480);ctx.drawImage(image,120,40,400,400)};
   draw();const stream=canvas.captureStream(10);window.qaCameraStream=stream;
   const timer=setInterval(draw,80);stream.getVideoTracks()[0].addEventListener('ended',()=>clearInterval(timer));return stream;
  };
 },qr);
 await page.goto(`${origin}/store/qa-pos`);
 await page.getByRole('button',{name:'Enter barcode',exact:true}).click();
 const input=page.locator('.pos-barcode-entry input');await input.waitFor();await input.fill('TEST-01');
 await page.getByRole('button',{name:'Add item',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.kyte-cart-cta')?.textContent.includes('1 item'));
 await page.getByRole('button',{name:'Enter barcode',exact:true}).click();assert(!await input.isVisible());
 const view=page.getByRole('button',{name:'Toggle product view'});
 assert.equal(await view.getAttribute('aria-pressed'),'false');await view.click();
 assert.equal(await view.getAttribute('aria-pressed'),'true');assert(await page.locator('.pos-product-grid').isVisible());
 await view.click();assert.equal(await page.locator('.pos-product-grid').count(),0);
 await page.goto(`${origin}/store/qa-pos`);
 const quantity=page.getByRole('button',{name:'Quantity to add',exact:true});
 await quantity.click();assert.match(await quantity.textContent(),/2×/);
 await page.locator('.kyte-product-row').first().click();
 await page.waitForFunction(()=>document.querySelector('.kyte-cart-cta')?.textContent.includes('2 items'));
 await page.locator('.kyte-product-row').first().click();await page.getByText(/only 2 in stock/).first().waitFor();
 assert.match(await page.locator('.kyte-cart-cta').textContent(),/2 items/);
 await quantity.click();assert.match(await quantity.textContent(),/5×/);await quantity.click();assert.match(await quantity.textContent(),/1×/);
 await page.goto(`${origin}/store/qa-pos`);
 await page.getByRole('button',{name:'Open camera scanner'}).click();
 await page.waitForFunction(()=>document.querySelector('.kyte-cart-cta')?.textContent.includes('1 item'),{},{timeout:20000});
 await page.waitForFunction(()=>window.qaCameraStream?.getTracks().every(track=>track.readyState==='ended'));
 await page.evaluate(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}});
 await page.getByRole('button',{name:'Open camera scanner'}).click();await page.getByText(/Allow camera access in your browser/).waitFor();
 await page.getByRole('button',{name:'Close scanner',exact:true}).first().click();
 fs.mkdirSync('/tmp/caribbean-layout-review',{recursive:true});
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/caribbean-layout-review/pos-toolbar-${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);await browser.close();console.log('POS toolbar passed: visible barcode entry, list/grid, 1/2/5 quantity, stock limits, camera fallback scan, stream cleanup, permission denial, phone widths.');
})().catch(error=>{console.error(error);process.exit(1)});
