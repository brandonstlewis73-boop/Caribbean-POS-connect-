"use client";
import Link from "next/link";
import { ChevronRight, ArrowUp, Square, Sparkles, Package, RotateCcw, UserRound } from "lucide-react";
import type { PlanUsageSummary } from "@/lib/plan-gating";
import { money } from "@/lib/constants";
import { getWorkflowGuide } from "@/lib/ai-workflows";
import { usesProductSelection, workflowName, workflowStarters } from "@/lib/ai-workspace-presentation";
import { useAiWorkspace } from "./workspace/useAiWorkspace";
import { AiWorkspaceNavigation } from "./workspace/AiWorkspaceNavigation";
import { AiWorkspaceResult } from "./workspace/AiWorkspaceResult";
import "./workspace/ai-workspace.css";

export function AiBusinessOSClient({usage,aiStatus,userName}: {
  usage:PlanUsageSummary;aiStatus:{enabled:boolean;hasApiKey:boolean;model:string};userName?:string;
}) {
  const ai=useAiWorkspace(usage,aiStatus.enabled);
  const guide=getWorkflowGuide(ai.toolId);
  const needsProduct=usesProductSelection(ai.toolId);
  const canSave=ai.toolId==="product_description_writer"&&ai.thread.completed&&ai.resources?.canSaveProducts===true&&ai.thread.resultProductId===ai.product?.id;
  const isPristine=ai.thread.requests.length===0&&!ai.thread.output;
  return <div className="ai-workspace">
    <div className="aw-page-heading"><div><h2>AI Workspace</h2><p>Your business, moving forward.</p></div><Link href="/help">Help</Link></div>
    <div className="aw-frame">
      <AiWorkspaceNavigation selected={ai.toolId} plan={usage.planId} onSelect={ai.selectWorkflow} disabled={ai.saving} usage={ai.meter}/>
      <div className={`aw-stage ${needsProduct?"aw-stage-with-product":""}`}>
        {needsProduct?<aside className="aw-product-panel" aria-label="Product context">
          <label htmlFor="ai-workspace-product">Choose product</label>
          <select id="ai-workspace-product" value={ai.thread.productId} disabled={ai.saving||ai.loadingResources} onChange={event=>ai.chooseProduct(event.target.value)}>
            <option value="">{ai.loadingResources?"Loading products…":"Select a product"}</option>
            {ai.resources?.products.map(product=><option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
          {ai.resourceMessage?<div className="aw-record-error"><p>{ai.resourceMessage}</p><button type="button" onClick={ai.reloadResources}><RotateCcw size={14}/>Reload records</button></div>:null}
          {ai.product?<div className="aw-product-details"><Package size={24}/><h3>{ai.product.name}</h3><p>{ai.product.category}</p><dl><div><dt>Price</dt><dd>{money(ai.product.sellingPrice,ai.resources?.currency)}</dd></div><div><dt>In stock</dt><dd>{ai.product.stock}</dd></div></dl><details><summary>Current description</summary><p>{ai.product.description||"No description saved yet."}</p></details></div>:<div className="aw-product-empty"><Package size={32}/><p>Select a product</p><span>Choose a product from your catalog to get started.</span></div>}
          {ai.resources&&!ai.resources.products.length&&!ai.resourceMessage?<Link className="aw-subtle-link" href="/products">Open your product catalog</Link>:null}
        </aside>:null}
        <div className="aw-chat">
          {!isPristine?<header className="aw-thread-heading"><h3>{workflowName(ai.toolId)}</h3><Link href={guide.workspace.href}>Open workspace <ChevronRight size={14}/></Link></header>:null}
          <div className="aw-conversation" aria-label="AI conversation">
            {isPristine?<div className="aw-welcome"><div className="aw-welcome-heading"><span className="aw-ai-avatar"><Sparkles size={23}/></span><div><h3>What would you like to get done?</h3><p>Choose a workflow and tell me your goal.</p></div></div><div className="aw-starters">{workflowStarters(ai.toolId).map(starter=><button type="button" key={starter.label} disabled={ai.saving||ai.busy} onClick={()=>ai.startWith(starter.prompt)}><span>{starter.label}</span><ChevronRight size={17}/></button>)}</div></div>:null}
            {ai.thread.requests.slice(-3).map((request,index)=><div className="aw-user-row" key={`${index}-${request}`}><span className="aw-user-avatar" aria-hidden="true">{userName?userName.split(/\s+/).map(part=>part[0]).slice(0,2).join(""):<UserRound size={17}/>}</span><div className="aw-user-message">{request}</div></div>)}
            {(ai.thread.output||ai.busy)?<AiWorkspaceResult workflowId={ai.toolId} title={workflowName(ai.toolId)} text={ai.thread.output} completed={ai.thread.completed} busy={ai.busy} saving={ai.saving} saved={ai.thread.saved} canSave={canSave} productName={ai.product?.name} onEdit={ai.setOutput} onSave={ai.saveProduct} onCopy={ai.copy} onDownload={ai.download}/>:null}
          </div>
          <div className="aw-composer-area">
            {ai.locked?<div className="aw-access-notice">{workflowName(ai.toolId)} is available on {ai.tool.requiredPlan}. <Link href="/subscription">View plans</Link></div>:null}
            {!aiStatus.enabled?<div className="aw-access-notice">AI is currently unavailable for this business.</div>:null}
            {ai.error?<div role="alert" className="aw-error">{ai.error}{ai.recordConflict?<button type="button" className="aw-reload-action" disabled={ai.loadingResources||ai.saving} onClick={ai.reloadAfterConflict}><RotateCcw size={14}/>{ai.loadingResources?"Reloading…":"Reload current product"}</button>:null}</div>:null}
            {ai.recordsReloaded&&ai.product?<details open className="aw-current-description"><summary>Current saved description</summary><p>{ai.product.description||"No description saved yet."}</p></details>:null}
            {ai.status?<p role="status" aria-live="polite" className="aw-status">{ai.status}</p>:null}
            <form className="aw-composer" onSubmit={event=>{event.preventDefault();void ai.run();}}>
              <label className="aw-sr-only" htmlFor="ai-workspace-request">Message your assistant</label>
              <textarea id="ai-workspace-request" ref={ai.composer} value={ai.thread.input} onChange={event=>ai.setInput(event.target.value)} placeholder={ai.thread.completed?"Tell me what to change…":"Tell me what you need…"} rows={3} maxLength={1800} disabled={ai.busy||ai.saving} />
              <div className="aw-composer-bottom"><span>{ai.thread.completed?"Continue the conversation":workflowName(ai.toolId)}</span>
                {ai.busy?<button type="button" className="aw-send" aria-label="Stop request" onClick={event=>{event.preventDefault();ai.stop();}}><Square size={17}/></button>:<button type="submit" className="aw-send" aria-label="Send request" disabled={ai.blocked||ai.saving||!ai.thread.input.trim()||(needsProduct&&!ai.product)}><ArrowUp size={20}/></button>}
              </div>
            </form>
            <p className="aw-footer-note">Check important details before saving or sharing.</p>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
