/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('@playwright/test');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const saves=[];
await page.route('**/api/**',route=>{if(route.request().method()==='POST'){saves.push(route.request().postDataJSON());return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'Test save captured'})});}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:{products:[],categories:[]}})});});
await page.goto(`${process.env.QA_ORIGIN||'http://127.0.0.1:3040'}/store/qa-dashboard?screen=inventory`);
await page.getByRole('combobox',{name:'inventory sections',exact:true}).selectOption('editor');await page.getByLabel('Product name',{exact:true}).fill('Price typing test');await page.getByRole('combobox',{name:'Product editor sections',exact:true}).selectOption('pricing');
const cost=page.getByLabel('Cost price',{exact:true}),selling=page.getByLabel('Selling price',{exact:true}),discount=page.getByLabel('Discount price optional',{exact:true});
assert.equal(await selling.inputValue(),'');assert.equal(await selling.getAttribute('inputmode'),'decimal');
await selling.pressSequentially('12.');assert.equal(await selling.inputValue(),'12.');await selling.pressSequentially('30');assert.equal(await selling.inputValue(),'12.30');
await selling.evaluate(el=>el.setSelectionRange(2,2));await selling.press('Backspace');assert.equal(await selling.inputValue(),'1.30');
await selling.fill('');assert.equal(await selling.inputValue(),'');await selling.pressSequentially('60.50');await cost.pressSequentially('12.25');await discount.pressSequentially('10,50');
await page.getByRole('button',{name:'Save product',exact:true}).click();await page.getByText('Test save captured',{exact:true}).waitFor();assert.equal(saves.length,1);assert.equal(saves[0].selling_price,60.5);assert.equal(saves[0].cost_price,12.25);assert.equal(saves[0].discount_price,10.5);
await selling.fill('1.234');await page.getByRole('button',{name:'Save product',exact:true}).click();await page.getByText('Enter valid prices with up to two decimal places. Selling price is required.',{exact:true}).waitFor();assert.equal(saves.length,1);
for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await browser.close();console.log('Product price browser checks passed: decimal typing, clearing, caret editing, comma input, numeric save payload, invalid amount prevention, and phone widths.');})().catch(e=>{console.error(e);process.exit(1)});
