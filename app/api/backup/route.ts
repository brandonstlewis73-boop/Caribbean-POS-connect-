import {NextRequest} from 'next/server';
import {fail} from '@/lib/api';
import {requireUser} from '@/lib/auth';
import {query,transaction} from '@/lib/db';
import {collectBusinessBackup} from '@/lib/business-backup';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const auth=await requireUser(request,'settings:write');
 if(!auth.user)return fail(auth.error,auth.status);
 const businessId=auth.user.business_id;
 if(!businessId)return fail('Business context is required.',400);
 try{
  const tables=await transaction(async client=>{
   await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY',[],client);
   return collectBusinessBackup(businessId,(sql,params)=>query(sql,params,client));
  });
  return new Response(JSON.stringify({exported_at:new Date().toISOString(),business_id:businessId,database:'supabase-postgres',tables},null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="caribbean-pos-connect-${Date.now()}.json"`,'Cache-Control':'private, no-store'}});
 }catch{return fail('Business backup could not be generated. Try again or contact support.',500)}
}
