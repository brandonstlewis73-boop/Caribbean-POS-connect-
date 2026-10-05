import assert from 'node:assert/strict';
import {collectBusinessBackup} from '../lib/business-backup';
async function main(){
 const calls:Array<{sql:string;params:unknown[]}>=[];
 const result=await collectBusinessBackup('tenant-a',async(sql,params)=>{calls.push({sql,params});return {rows:[{business_id:params[0]}]}});
 assert.equal(calls.length,13);for(const call of calls){assert.deepEqual(call.params,['tenant-a']);assert.match(call.sql,/WHERE (?:[oc]\.)?(?:business_id|id)=\$1/)}
 assert.ok(!('settings' in result));assert.ok('business_settings' in result);assert.ok('categories' in result);
 const users=calls.find(call=>call.sql.includes(' FROM users '))!;assert.ok(!users.sql.includes('*'));assert.ok(!users.sql.includes('password_hash'));
 assert.match(calls.find(call=>call.sql.includes('FROM order_items'))!.sql,/JOIN orders/);assert.match(calls.find(call=>call.sql.includes('FROM loyalty_transactions'))!.sql,/JOIN customers/);
 let queried=false;await assert.rejects(()=>collectBusinessBackup('',async()=>{queried=true;return {rows:[]}}),/Business context/);assert.equal(queried,false);
 console.log('Business backup tenant boundaries, related-record joins, credential omission and missing-tenant rejection passed.');
}void main();
