import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {fail} from '@/lib/api';
import {getBusinessSettings} from '@/lib/data';
import {createReceiptPreviewPdfBuffer} from '@/lib/receipt';
export const runtime='nodejs';
const schema=z.object({receipt_template:z.enum(['modern','classic','minimal']),receipt_show_logo:z.boolean(),receipt_message:z.string().max(500)}).strict();
export async function POST(request:NextRequest){
 const auth=await requireUser(request,'settings:write');if(!auth.user)return fail(auth.error,auth.status);
 if(!auth.user.business_id)return fail('Business account required',403);
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return fail('Choose valid receipt preferences',422);
 const settings=await getBusinessSettings(auth.user.business_id);
 const buffer=await createReceiptPreviewPdfBuffer({...settings,...parsed.data});
 return new Response(new Uint8Array(buffer),{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="receipt-preview.pdf"','Cache-Control':'no-store'}});
}
