/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('@playwright/test');
const assert=require('node:assert/strict');
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:3040';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 let posts=0,optedOut=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>{if(route.request().method()==='POST')posts++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{order:{customer_snapshot:{phone:'+14437582368',notification_whatsapp:!optedOut}}}})});});
 await page.goto(`${origin}/store/qa-dashboard?screen=receipts`);
 const printLink=page.getByRole('link',{name:'Print',exact:true}).first();
 assert.equal(await printLink.getAttribute('target'),'_blank');
 assert.match(await printLink.getAttribute('rel'),/noopener/);
 const share=page.getByRole('button',{name:'WhatsApp · free',exact:true}).first();await share.click();
 const message=page.getByLabel('Receipt message',{exact:true});await message.waitFor();assert.match(await message.inputValue(),/Receipt #R-0/);
 const link=page.getByRole('link',{name:'Open customer WhatsApp',exact:true});
 let url=new URL(await link.getAttribute('href'));assert.equal(url.hostname,'wa.me');assert.equal(url.pathname,'/14437582368');assert.match(url.searchParams.get('text'),/Receipt #R-0/);
 await message.fill('Receipt update & confirmation');url=new URL(await link.getAttribute('href'));assert.equal(url.searchParams.get('text'),'Receipt update & confirmation');
 await page.getByRole('button',{name:'Close receipt sharing',exact:true}).click();await share.click();await message.waitFor();assert.match(await message.inputValue(),/Receipt #R-0/);assert.equal(posts,0,'Free sharing must never call automatic-send API');
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByRole('button',{name:'Close receipt sharing',exact:true}).click();optedOut=true;await share.click();await page.getByText('This customer has opted out of WhatsApp updates.',{exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Open customer WhatsApp',exact:true}).count(),0);assert.deepEqual(errors,[]);assert.equal(posts,0);
 await browser.close();console.log('Free receipt browser checks passed: preview, correct phone, encoded edits, repeat sharing, no automatic sends, opt-out, mobile widths.');
})().catch(error=>{console.error(error);process.exit(1)});
