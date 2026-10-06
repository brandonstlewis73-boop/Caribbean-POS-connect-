import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import { arrivalFromDuration, calculateDeliveryEta } from "../lib/delivery-eta";
import { createSession } from "../lib/auth";
import { POST } from "../app/api/deliveries/[id]/eta/route";
import type { Order } from "../lib/types";
async function main() {
  process.env.CPC_AUTO_MIGRATE="false";process.env.SESSION_SECRET="test-delivery-eta-secret-at-least-32-bytes";
  assert.equal(arrivalFromDuration(120,new Date('2026-10-06T23:59:00Z').getTime()).arrival,'2026-10-07T00:01:00.000Z');
  assert.equal(arrivalFromDuration(61,0).minutes,2);
  for(const duration of [NaN,-1,Infinity,9999999])assert.throws(()=>arrivalFromDuration(duration));
  const oldFetch=globalThis.fetch,oldPool=globalThis.__cpcPool;
  let fetches=0,writes=0,failRoute=false;
  const row={id:'order-a',business_id:'tenant-a',assigned_driver_id:'driver-a',order_number:'123',order_type:'delivery',delivery_status:'assigned',status:'ready',created_at:new Date().toISOString(),customer_snapshot:{name:'Customer',gps_latitude:39.7,gps_longitude:-75.7},delivery_latitude:39.7,delivery_longitude:-75.7};
  const user={id:'driver-a',business_id:'tenant-a',name:'Driver',email:'driver@example.test',password_hash:'test-hash',role:'driver' as const,active:true,phone:null};
  globalThis.__cpcPool={query:async(sql:string,params:unknown[])=>{
    if(sql.startsWith('SELECT id, business_id'))return{rows:[user]};
    if(sql.includes('INSERT INTO security_rate_limits'))return{rows:[{attempts:1,retry_after:1}]};
    if(sql.includes('SELECT o.*')){assert(sql.includes('business_id'));return{rows:params[1]===row.business_id?[row]:[]};}
    if(sql.startsWith('UPDATE orders SET estimated_delivery_at')){writes++;assert.equal(params[2],'tenant-a');assert.equal(params[3],'driver-a');assert(sql.includes('assigned_driver_id=$4'));Object.assign(row,{estimated_delivery_at:params[0]});return{rows:[{id:row.id}]};}
    return{rows:[]};
  }} as unknown as Pool;
  globalThis.fetch=async(url)=>{fetches++;assert(String(url).startsWith('https://router.project-osrm.org/route/v1/driving/'));return new Response(JSON.stringify(failRoute?{code:'NoRoute'}:{code:'Ok',routes:[{duration:900,distance:5000}]}),{headers:{'Content-Type':'application/json'}})};
  try{
    const token=await createSession(user);
    const request=()=>new NextRequest('https://app.example/api/deliveries/order-a/eta',{method:'POST',headers:{cookie:`cpc_session=${token}`,'Content-Type':'application/json'},body:JSON.stringify({latitude:39.65,longitude:-75.72})});
    const params={params:Promise.resolve({id:'order-a'})};
    const response=await POST(request(),params);assert.equal(response.status,200);const data=await response.json();assert.equal(data.data.estimate.minutes,15);assert.equal(data.data.estimate.trafficAware,false);assert.equal(writes,1);
    row.assigned_driver_id='driver-b';const before=fetches;assert.equal((await POST(request(),params)).status,404);assert.equal(fetches,before);assert.equal(writes,1);
    user.business_id='tenant-b';assert.equal((await POST(request(),params)).status,404);assert.equal(fetches,before);user.business_id='tenant-a';
    row.assigned_driver_id='driver-a';row.delivery_status='delivered';assert.equal((await POST(request(),params)).status,409);assert.equal(fetches,before);
    row.delivery_status='assigned';failRoute=true;assert.equal((await POST(request(),params)).status,422);assert.equal(writes,1,'Routing failure must preserve previous ETA');
    await assert.rejects(()=>calculateDeliveryEta(row as unknown as Order,{latitude:NaN,longitude:0}));
    const addressOrder = {...row,delivery_latitude:null,delivery_longitude:null,customer_snapshot:{name:"Customer",street_address:"750 Library Avenue",city:"Newark",country:"United States",gps_latitude:1,gps_longitude:2}} as unknown as Order;
    failRoute = false;
    globalThis.fetch = async url => { if (!String(url).includes("nominatim")) assert(String(url).includes(";-75.7,39.7"), "Route must use the geocoded delivery address, not stale profile GPS"); return new Response(JSON.stringify(String(url).includes("nominatim") ? [{lat:"39.7",lon:"-75.7"}] : {code:"Ok",routes:[{duration:900,distance:5000}]})); };
    assert.equal((await calculateDeliveryEta(addressOrder,{latitude:39.65,longitude:-75.72})).minutes,15);
    globalThis.fetch = async () => new Response(JSON.stringify([{lat:"39.7",lon:"-75.7"},{lat:"40",lon:"-76"}]));
    await assert.rejects(()=>calculateDeliveryEta(addressOrder,{latitude:39.65,longitude:-75.72}),/one clear destination/);
    globalThis.fetch = async () => new Response(JSON.stringify({code:"Ok",routes:[{duration:900,distance:5000}],waypoints:[{distance:900}]}));
    await assert.rejects(()=>calculateDeliveryEta(row as unknown as Order,{latitude:39.65,longitude:-75.72}),/too far/);
    console.log('Delivery ETA checks passed: road duration, next-day dates, assigned-driver access, completed delivery rejection, no traffic claims, and failed route preserves ETA.');
  }finally{globalThis.fetch=oldFetch;globalThis.__cpcPool=oldPool;}
}
main().catch(e=>{console.error(e);process.exitCode=1});
