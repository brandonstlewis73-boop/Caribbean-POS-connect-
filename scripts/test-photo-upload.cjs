/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('@playwright/test');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
// Runs the actual photo pipeline in Chromium, without app/database/storage writes.
(async()=>{
  const browser = await chromium.launch({args:['--no-sandbox']});
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/photo-upload.ts'),'utf8').replace('import.meta.url', '"https://test.invalid/photo-upload.js"'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    await page.addScriptTag({content:`{const exports={}; ${code}; window.photoTest=exports;}`});
const result=await page.evaluate(async()=>{const {optimizePhoto,validateSourcePhoto,photoType}=window.photoTest;const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1800;const ctx=canvas.getContext('2d');const pixels=ctx.createImageData(canvas.width,canvas.height);let seed=123;for(let i=0;i<pixels.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',1));const source=new File([blob],'IMG_1234.JPG',{type:'image/jpeg'});const optimized=await optimizePhoto(source,{maxBytes:750*1024,maxDimension:1200});const image=new Image();const url=URL.createObjectURL(optimized);image.src=url;await image.decode();const dims=[image.naturalWidth,image.naturalHeight];URL.revokeObjectURL(url);
return {source:source.size,output:optimized.size,type:optimized.type,dims, productSize:(await optimizePhoto(source,{maxBytes:3*1024*1024,maxDimension:1600})).size, tooLarge:validateSourcePhoto({name:'photo.jpg',type:'image/jpeg',size:31*1024*1024}), empty:validateSourcePhoto({name:'photo.jpg',type:'image/jpeg',size:0}), heic:validateSourcePhoto({name:'IMG.HEIC',type:'',size:5*1024*1024}), inferred:photoType({name:'IMG.HEIC',type:'application/octet-stream'}), html:validateSourcePhoto({name:'photo.html',type:'text/html',size:500})};});
assert(result.source>10*1024*1024);assert(result.output<=750*1024);assert(result.productSize<=3*1024*1024);assert.equal(result.type,'image/jpeg');assert(Math.max(...result.dims)<=1200);assert(result.tooLarge);assert(result.empty);assert(result.html);assert.equal(result.heic,null);assert.equal(result.inferred,'image/heic');
const alpha=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=1200;const ctx=c.getContext('2d'),p=ctx.createImageData(1200,1200);let seed=100;for(let i=0;i<p.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;p.data[i]=seed&255;p.data[i+1]=(seed>>>8)&255;p.data[i+2]=(seed>>>16)&255;p.data[i+3]=(i/4)%1200<100?0:128;}ctx.putImageData(p,0,0);const source=new File([await new Promise(r=>c.toBlob(r,'image/png'))],'transparent.png',{type:'image/png'});const output=await window.photoTest.optimizePhoto(source,{maxBytes:750*1024,maxDimension:1200});const img=new Image(),url=URL.createObjectURL(output);img.src=url;await img.decode();c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);const alpha=c.getContext('2d').getImageData(1,1,1,1).data[3];URL.revokeObjectURL(url);return{source:source.size,size:output.size,type:output.type,alpha}});assert(alpha.source>750*1024);assert(alpha.size<=750*1024);assert.equal(alpha.type,'image/png');assert.equal(alpha.alpha,0);
await page.evaluate(async()=>{
  try { await window.photoTest.optimizePhoto(new File(['not an image'],'broken.jpg',{type:'image/jpeg'}),{maxBytes:750*1024,maxDimension:1200}); }
  catch(error) { if(error.message.includes('could not be opened')) return; throw error; }
  throw new Error('Corrupt photo was accepted');
});
await page.evaluate(async()=>{
  const OriginalWorker=window.Worker;
  const canvas=document.createElement('canvas');canvas.width=40;canvas.height=20;canvas.getContext('2d').fillRect(0,0,40,20);
  const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));
  let terminated=0;
  try {
    window.Worker=class {postMessage(){setTimeout(()=>this.onmessage({data:{blob:jpeg}}),0)}terminate(){terminated++}};
    const output=await window.photoTest.optimizePhoto(new File(['unsupported-native-heic'],'IMG.HEIC',{type:'image/heic'}),{maxBytes:750*1024,maxDimension:1200});
    if(output.type!=='image/jpeg'||terminated!==1)throw Error('HEIC fallback output/cleanup failed');
    window.Worker=class {postMessage(){setTimeout(()=>this.onmessage({data:{error:'Unsupported photo'}}),0)}terminate(){terminated++}};
    try {await window.photoTest.optimizePhoto(new File(['bad'],'IMG.HEIC',{type:'image/heic'}),{maxBytes:750*1024,maxDimension:1200});throw Error('Corrupt HEIC accepted');}
    catch(error){if(error.message!=='Unsupported photo')throw error;}
    if(terminated!==2)throw Error('Failed HEIC worker was not released');
  } finally {window.Worker=OriginalWorker;}
});
console.log('PASS: 11MB source, logo/product byte budgets, dimensions, PNG alpha, MIME inference, HEIC source validation, corrupt/empty/oversize/unsupported file rejection. HEIC fallback and worker cleanup checked with mocks; physical iPhone verification remains.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
