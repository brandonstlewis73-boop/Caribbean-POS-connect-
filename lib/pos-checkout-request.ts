import {createHash} from 'node:crypto';
import {query} from './db';
import type {PoolClient} from 'pg';
export async function claimCheckoutRequest(client:PoolClient,businessId:string,userId:string,key:string,payload:unknown){
 if(!/^[0-9a-f-]{36}$/i.test(key))throw Error('Invalid checkout request key.');
 const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 await query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[`pos:${businessId}:${userId}:${key}`],client);
 const existing=await query<{entity_id:string;request_hash:string}>(`SELECT a.entity_id,a.metadata->>'request_hash' AS request_hash FROM audit_logs a JOIN orders o ON o.id=a.entity_id WHERE a.action='order:create' AND a.user_id=$1 AND o.business_id=$2 AND a.metadata->>'request_key'=$3 ORDER BY a.created_at DESC LIMIT 1`,[userId,businessId,key],client);
 if(existing.rows[0]&&existing.rows[0].request_hash!==hash)throw Error('This checkout request already saved a different sale. Refresh Orders before continuing.');
 return {request_key:key,request_hash:hash,existingOrderId:existing.rows[0]?.entity_id};
}
