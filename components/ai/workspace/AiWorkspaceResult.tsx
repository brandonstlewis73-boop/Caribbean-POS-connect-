import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, Pencil, Save, Sparkles, ArrowUpRight } from "lucide-react";
import { canOpenWhatsApp } from "@/lib/ai-workspace-presentation";
import type { AiBusinessToolId } from "@/lib/ai-business-config";
export function AiWorkspaceResult({ workflowId, title, source, text, completed, busy, saving, saved, canSave, productName, onEdit, onSave, onCopy, onDownload }: {
  workflowId: AiBusinessToolId; title:string; source?:"ai"|"catalog"; text:string; completed:boolean; busy:boolean;
  saving:boolean; saved:boolean; canSave:boolean; productName?:string;
  onEdit:(text:string)=>void;onSave:()=>void;onCopy:()=>void;onDownload:()=>void;
}) {
  const [editing,setEditing]=useState(false);
  const editor=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{setEditing(false);},[workflowId,busy]);
  useEffect(()=>{if(editing)editor.current?.focus();},[editing]);
  return <div className="aw-answer-row"><span className="aw-ai-avatar" aria-hidden="true"><Sparkles size={20}/></span>
    <article className="aw-result" aria-label="Assistant result">
      <div className="aw-result-heading"><h3>{title}</h3>{saved?<span className="aw-saved"><Check size={14}/>Saved</span>:null}</div>
      {source==="catalog"?<p className="aw-save-caption">Prepared from saved business details</p>:null}
      {editing?<label className="aw-edit-label">Edit response<textarea ref={editor} value={text} onChange={event=>onEdit(event.target.value)} rows={8} maxLength={4000}/></label>:<div className="aw-result-text">{text||"Working on your request…"}</div>}
      {completed?<div className="aw-result-actions">
        <button type="button" disabled={busy||saving} onClick={()=>setEditing(!editing)}><Pencil size={16}/>{editing?"Done editing":"Edit"}</button>
        {canSave?<button type="button" className="aw-save-action" disabled={busy||saving||saved||!text.trim()} onClick={onSave} title={`Save description to ${productName}`}>
          {saving?<Loader2 className="aw-spin" size={16}/>:saved?<Check size={16}/>:<Save size={16}/>}{saving?"Saving…":saved?"Saved to product":"Save to product"}
        </button>:null}
        {canOpenWhatsApp(workflowId)&&text.trim()?<a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><ArrowUpRight size={16}/>Open in WhatsApp</a>:null}
        <button type="button" disabled={busy||saving||!text.trim()} onClick={onCopy}><Copy size={16}/>Copy</button>
        <button type="button" disabled={busy||saving||!text.trim()} onClick={onDownload}><Download size={16}/>Download</button>
      </div>:null}
      {canSave&&!saved?<p className="aw-save-caption">Saves this description to {productName}.</p>:null}
    </article>
  </div>;
}
