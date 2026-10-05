'use client';
import {useEffect,useState} from 'react';
import {Check,Eye,Save} from 'lucide-react';
import {Panel,PanelHeader} from '@/components/ui/Panel';
import {Button} from '@/components/ui/Button';
import {readApiPayload} from '@/lib/client-response';
import {RECEIPT_TEMPLATES,receiptTemplate,type ReceiptTemplate} from '@/lib/receipt-templates';
import type {Settings} from '@/lib/types';

type Preferences={receipt_template:ReceiptTemplate;receipt_show_logo:boolean;receipt_message:string};
export function ReceiptTemplateTools({settings,canEdit}:{settings:Settings;canEdit:boolean}){
 const initial:Preferences={receipt_template:receiptTemplate(settings.receipt_template),receipt_show_logo:settings.receipt_show_logo!==false,receipt_message:settings.receipt_message||''};
 const [draft,setDraft]=useState(initial),[saved,setSaved]=useState(initial),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[preview,setPreview]=useState('');
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 function change(patch:Partial<Preferences>){setDraft(current=>({...current,...patch}));setMessage('');setPreview('');}
 async function perform(action:'save'|'preview'){
  if(busy||!canEdit)return;setBusy(action);setMessage('');
  try{
   const response=await fetch(action==='save'?'/api/settings':'/api/receipts/preview',{method:action==='save'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
   if(action==='preview'&&response.ok){const blob=await response.blob();if(!blob.type.includes('application/pdf'))throw Error('The receipt preview could not be opened.');setPreview(URL.createObjectURL(blob));setMessage('Preview ready. Open the PDF below to inspect or print it.');return;}
   const payload=await readApiPayload<{settings:Settings}>(response);
   if(!response.ok)throw Error(payload.error||'Receipt preferences could not be saved.');
   if(!payload.data?.settings)throw Error('No saved preferences were returned. Refresh before trying again.');
   const next={receipt_template:receiptTemplate(payload.data.settings.receipt_template),receipt_show_logo:payload.data.settings.receipt_show_logo!==false,receipt_message:payload.data.settings.receipt_message||''};setSaved(next);setDraft(next);setMessage('Receipt design saved for this business. New PDF downloads use this design.');
  }catch(error){setMessage(error instanceof Error?error.message:'Request failed. Check your connection and try again.');}finally{setBusy('');}
 }
 return <section id="receipt-templates" className="min-w-0 scroll-mt-24 xl:col-span-2"><Panel><PanelHeader title="Receipt templates" description="Give your receipts a look that fits your business."/><div className="grid min-w-0 gap-5 p-4 sm:p-6">
  <div className="grid min-w-0 gap-3 md:grid-cols-3" role="group" aria-label="Receipt template">
   {RECEIPT_TEMPLATES.map(template=><button key={template.id} type="button" disabled={!canEdit||Boolean(busy)} aria-pressed={draft.receipt_template===template.id} onClick={()=>change({receipt_template:template.id})} className={`min-w-0 rounded-card border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:opacity-60 ${draft.receipt_template===template.id?'border-cyan-300 bg-cyan-300/10':'border-white/15 bg-white/5'}`}>
    <div aria-hidden="true" style={{background:'#fff',color:'#111',fontFamily:template.id==='classic'?'monospace':'Arial,sans-serif',padding:'18px 14px',borderRadius:8,textAlign:template.id==='minimal'?'left':'center',minHeight:174}}>
     <p style={{fontSize:template.id==='minimal'?12:15,fontWeight:800,overflowWrap:'anywhere'}}>{settings.business_name||'Your business'}</p><p style={{fontSize:9,marginTop:5}}>ORDER RECEIPT</p><div style={{borderTop:template.id==='minimal'?'none':template.id==='classic'?'1px dashed #777':'1px solid #aaa',marginTop:15,paddingTop:8,fontSize:10,display:'flex',justifyContent:'space-between',gap:8}}><span>2 × Sample item</span><span>60.00</span></div><div style={{marginTop:16,display:'flex',justifyContent:'space-between',gap:8,fontWeight:800,fontSize:template.id==='modern'?16:13}}><span>TOTAL</span><span>60.00</span></div><p style={{fontSize:9,marginTop:12}}>Thank you for your order</p>
    </div><span className="mt-3 flex items-center justify-between gap-2 font-black">{template.name}{draft.receipt_template===template.id?<Check className="h-4 w-4 shrink-0 text-cyan-200"/>:null}</span><span className="mt-1 block text-xs leading-5 text-teal-50/65">{template.description}</span>
   </button>)}
  </div>
  <div className="grid min-w-0 gap-4 md:grid-cols-2"><label className="flex items-center justify-between gap-3 self-start rounded-card border border-white/15 p-4 text-sm font-bold"><span>Include business logo<span className="mt-1 block text-xs font-normal text-teal-50/60">Uses the logo saved in business settings.</span></span><input type="checkbox" checked={draft.receipt_show_logo} disabled={!canEdit||Boolean(busy)} onChange={event=>change({receipt_show_logo:event.target.checked})}/></label><label className="grid min-w-0 gap-2 text-sm font-bold">Receipt footer<textarea maxLength={500} rows={3} disabled={!canEdit||Boolean(busy)} value={draft.receipt_message} onChange={event=>change({receipt_message:event.target.value})} className="min-w-0 w-full rounded-card border border-white/15 bg-black/20 p-3 text-base font-normal"/><span className="text-xs font-normal text-teal-50/55">{draft.receipt_message.length}/500 characters</span></label></div>
  <div className="flex flex-wrap items-center gap-3"><Button disabled={!canEdit||Boolean(busy)} onClick={()=>void perform('preview')}><Eye size={16}/>{busy==='preview'?'Preparing preview…':'Preview PDF'}</Button><Button variant="primary" disabled={!canEdit||Boolean(busy)||!dirty} onClick={()=>void perform('save')}><Save size={16}/>{busy==='save'?'Saving…':'Save receipt design'}</Button>{dirty?<span className="text-xs text-amber-100">Unsaved changes</span>:<span className="text-xs text-teal-50/55">Saved design</span>}</div>
  {preview?<a href={preview} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-bold text-cyan-200 underline">Open receipt preview PDF</a>:null}
  {message?<p role="status" className="rounded-card border border-white/10 bg-white/5 p-3 text-sm">{message}</p>:null}
  <p className="text-xs leading-5 text-teal-50/60">Sample previews do not create an order or record a payment. Designs apply to PDF receipts from Orders, POS and Receipts. Print at actual size on 80 mm paper.{!canEdit?' An owner or manager with settings access can change the design.':''}</p>
 </div></Panel></section>;
}
