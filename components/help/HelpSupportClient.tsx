"use client";
import {Pagination,usePagination} from "@/components/workspace/Pagination";
import {Workspace,WorkspaceSection} from "@/components/workspace/Workspace";

import { assertLocalAiSupport, generateLocalDraft } from "@/lib/local-ai";
import type { LocalGeneration } from "@/lib/local-ai-config";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Bot,
  ClipboardList,
  MessageCircle,
  PackagePlus,
  Search,
  Send,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Tags,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { GETTING_STARTED_CHECKLIST, HELP_CATEGORIES } from "@/lib/support-context";
import type { HelpArticle, Settings, SupportTicket, SupportTicketPriority, SupportTicketStatus, User } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  configured?: boolean;
};

type TicketDraft = {
  name: string;
  business_name: string;
  email: string;
  phone: string;
  issue_category: string;
  priority: SupportTicketPriority;
  message: string;
  screenshot_url: string;
};

type GuideCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: string[];
};

const guideCards: GuideCard[] = [
  { id: "billing", title: "Manage your subscription", description: "Review your plan and PayPal checkout status.", category: "Billing & Subscriptions", icon: Tags, steps: ["Open Subscription & Billing.", "Choose Current subscription to review the saved plan status.", "Open Choose a plan and select the plan you need.", "Complete PayPal approval when checkout is configured. A pending approval does not activate the plan until payment is confirmed."] },
  { id: "receipt-design", title: "Customize your receipts", description: "Choose a receipt template and preview it before printing.", category: "Orders & Checkout", icon: ClipboardList, steps: ["Open Printers and choose Receipt design.", "Choose a template and update the receipt details.", "Save the design, then preview the PDF.", "Use Print & share to open the browser print dialog and select your printer."] },
  {
    id: "add-product",
    title: "How to add a product",
    description: "Create products with price, stock, image, SKU, barcode, and category.",
    category: "Products & Categories",
    icon: PackagePlus,
    steps: ["Open Inventory.", "Choose Product editor, then open the product details section.", "Enter product details and category.", "Save and confirm the item appears in POS and storefront."]
  },
  {
    id: "create-categories",
    title: "How to create categories",
    description: "Organize products so checkout and storefront browsing stay clean.",
    category: "Products & Categories",
    icon: Tags,
    steps: ["Open Settings.", "Find Categories.", "Add or rename a category.", "Save changes and check POS filters."]
  },
  {
    id: "order-status",
    title: "How to change order status",
    description: "Move orders from New to Accepted, Preparing, Ready, Out for Delivery, Completed, or Cancelled.",
    category: "Orders & Checkout",
    icon: ClipboardList,
    steps: ["Open Orders.", "Select the order.", "Use the status action button.", "Open Notifications to send the customer a WhatsApp update when needed."]
  },
  {
    id: "free-whatsapp",
    title: "Send a free WhatsApp order update",
    description: "Prepare the update in Orders, then send it in WhatsApp.",
    category: "WhatsApp/SMS Notifications",
    icon: MessageCircle,
    steps: ["Open Settings → Notifications → WhatsApp updates and choose Use free WhatsApp to disable paid automatic sends.", "Open Orders, select the order, then choose Notifications.", "Review the customer message and select Open customer WhatsApp.", "Tap Send in WhatsApp. Check its ticks for delivery confirmation."]
  },
  {
    id: "whatsapp-sandbox",
    title: "Why WhatsApp sandbox messages fail",
    description: "Fix the common Twilio sandbox issue where the receiving phone has not joined.",
    category: "Troubleshooting",
    icon: AlertTriangle,
    steps: ["Open Twilio WhatsApp Sandbox.", "Join the sandbox from the receiving phone.", "Use whatsapp:+countrycode format.", "Try the test message again."]
  },
  {
    id: "storefront",
    title: "How to customize the storefront",
    description: "Update store name, logo, hours, pickup, delivery, and storefront link.",
    category: "Storefront Setup",
    icon: Store,
    steps: ["Open Settings.", "Update Business Profile and Storefront Settings.", "Upload the logo if needed.", "Open the storefront link and place a test order."]
  },
  {
    id: "customers",
    title: "How to add customers",
    description: "Save customer contact and delivery details for checkout and delivery.",
    category: "Customers",
    icon: UserPlus,
    steps: ["Open Customers.", "Add name and phone.", "Add delivery address if needed.", "Save and confirm the customer appears in checkout."]
  },
  {
    id: "export-orders",
    title: "How to export orders",
    description: "Download sales/order data for accounting and daily review.",
    category: "Reports",
    icon: ShoppingCart,
    steps: ["Open Reports.", "Choose the date range.", "Select export if available.", "Review the downloaded sales file."]
  },
  {
    id: "ai-marketing",
    title: "How to use AI marketing tools",
    description: "Generate promo ideas, product descriptions, and slow-day sales suggestions.",
    category: "AI Features",
    icon: Bot,
    steps: ["Open AI tools.", "Choose the business task.", "Review the generated answer.", "Edit before saving, sending, or applying."]
  },
  {
    id: "missing-env",
    title: "How to fix missing environment variables",
    description: "Use the health check to see which production settings are missing.",
    category: "Troubleshooting",
    icon: SettingsIcon,
    steps: ["Open /api/health.", "Read only the safe missing-variable names.", "Add values in Vercel Production.", "Redeploy before testing again."]
  }
];

const troubleshootingCards = [
  { title: "Free WhatsApp message not sent", description: "Opening WhatsApp prepares a message; it does not send it.", fix: "Open Orders → order details → Notifications. Check the customer phone number, open customer WhatsApp, then tap Send. A customer who opted out cannot receive these updates." },
  {
    title: "Twilio Error 63015",
    description: "The receiving WhatsApp number has not joined the Twilio sandbox or the sender is not approved.",
    fix: "Join the sandbox from the receiving phone, confirm TWILIO_WHATSAPP_FROM uses whatsapp:+number, then send a test message."
  },
  {
    title: "Local AI cannot load",
    description: "The browser needs WebGPU, sufficient free memory, and an initial model download.",
    fix: "Use a WebGPU-compatible browser, check available memory, and allow the initial model download."
  },
  {
    title: "Missing Twilio environment variables",
    description: "WhatsApp or SMS messages cannot send without provider credentials.",
    fix: "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, and TWILIO_PHONE_NUMBER if SMS is used."
  },
  {
    title: "Storefront items not showing",
    description: "Products may be inactive, uncategorized, out of stock, or tied to a different business.",
    fix: "Check Inventory product status, category visibility, storefront status, and business account selection."
  },
  {
    title: "Orders not saving",
    description: "This is usually database connectivity, validation, or a missing customer/order field.",
    fix: "Open /api/health, confirm database connected, then test one small checkout with customer name and phone."
  },
  {
    title: "Customer notifications failing",
    description: "Notification preferences, provider credentials, phone formatting, or plan limits may block sends.",
    fix: "Check Settings notification toggles, WhatsApp test message, customer phone format, and subscription limits."
  },
  {
    title: "Categories not updating",
    description: "POS and storefront depend on saved active categories for the current business.",
    fix: "Rename or add the category in Settings, keep it active, then refresh POS/storefront if needed."
  },
  {
    title: "Build or deployment issues",
    description: "Production changes require a fresh Vercel deployment and valid Production environment variables.",
    fix: "Check Vercel build logs, confirm env vars are in Production, and redeploy the latest main branch."
  }
];

const priorityTone: Record<SupportTicketPriority, "neutral" | "amber" | "coral" | "red"> = {
  low: "neutral",
  medium: "amber",
  high: "coral",
  urgent: "red"
};

const statusTone: Record<SupportTicketStatus, "neutral" | "green" | "amber" | "teal"> = {
  new: "teal",
  open: "amber",
  waiting_on_customer: "neutral",
  resolved: "green",
  closed: "neutral"
};

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Screenshot could not be read."));
    reader.readAsDataURL(file);
  });
}

export function HelpSupportClient({
  articles: initialArticles,
  tickets: initialTickets,
  user,
  settings,
  canManage,
  aiStatus,
  systemStatus
}: {
  articles: HelpArticle[];
  tickets: SupportTicket[];
  user: User;
  settings: Settings;
  canManage: boolean;
  aiStatus: { enabled: boolean; message: string; model: string };
  systemStatus: { databaseConfigured: boolean; vercelEnv: string | null; nodeEnv: string };
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [supportView, setSupportView] = useState("guides");
  const [requestStep, setRequestStep] = useState("issue");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [activeTrouble, setActiveTrouble] = useState(troubleshootingCards[0].title);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [localProgress, setLocalProgress] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: aiStatus.enabled
        ? "Ask a question about using Caribbean POS Connect. I can help with setup, checkout, products, customers, storefront, WhatsApp, AI features, and billing."
        : "Local AI is disabled. Help articles and support tickets remain available.",
      configured: aiStatus.enabled
    }
  ]);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>({
    name: user.name || "",
    business_name: settings.business_name || "",
    email: user.email || "",
    phone: user.phone || settings.business_phone || "",
    issue_category: "Troubleshooting",
    priority: "medium",
    message: "",
    screenshot_url: ""
  });
  const [ticketMessage, setTicketMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [ticketUpdateMessage, setTicketUpdateMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const activeGuide = guideCards.find((guide) => guide.id === activeGuideId) || guideCards[0];
  const activeTroubleshooting = troubleshootingCards.find((card) => card.title === activeTrouble) || troubleshootingCards[0];

  const filteredGuideCards = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return guideCards.filter((card) => {
      const categoryMatch = selectedCategory === "All" || card.category === selectedCategory;
      const searchMatch = !needle || [card.title, card.description, card.category, ...card.steps].join(" ").toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [search, selectedCategory]);

  const filteredArticles = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return initialArticles.filter((article) => {
      const categoryMatch = selectedCategory === "All" || article.category === selectedCategory;
      const searchMatch = !needle || [article.title, article.category, article.content, ...article.tags].join(" ").toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [initialArticles, search, selectedCategory]);

  function validateTicket() {
    if (ticketDraft.name.trim().length < 2) return "Enter your name.";
    if (!ticketDraft.email.includes("@")) return "Enter a valid email address.";
    if (!ticketDraft.issue_category.trim()) return "Choose an issue category.";
    if (ticketDraft.message.trim().length < 10) return "Tell us what happened in at least 10 characters.";
    return "";
  }

  async function askSupport(question = chatInput) {
    const clean = question.trim();
    if (!clean || chatBusy) return;
    setChatBusy(true);
    setChatInput("");
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: clean }];
    setChatMessages(nextMessages);
    try {
      assertLocalAiSupport();
      const response = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: clean,
          currentPage: window.location.pathname,
          messages: nextMessages.slice(-8)
        })
      });
      const payload = await readApiPayload<{ answer: string; configured: boolean; model: string; generation?: LocalGeneration }>(response);
      if (!response.ok || !payload.data) throw new Error(payload.error || "Support chat could not answer.");
      const answer = payload.data.generation ? await generateLocalDraft(payload.data.generation, setLocalProgress) : payload.data.answer;
      setChatMessages((current) => [...current, { role: "assistant", content: answer, configured: Boolean(payload.data!.generation) || payload.data!.configured }]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "Support chat could not answer. Submit a support request for help." }
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function submitTicket() {
    const validation = validateTicket();
    setTicketMessage(null);
    if (validation) {
      setRequestStep(validation === "Enter your name." || validation === "Enter a valid email address." ? "contact" : "issue");
      setTicketMessage({ tone: "error", text: validation });
      return;
    }
    setBusy("ticket");
    try {
      const response = await fetch("/api/help/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketDraft)
      });
      const payload = await readApiPayload<{ ticket: SupportTicket }>(response);
      if (!response.ok || !payload.data?.ticket) throw new Error(payload.error || "Support request could not be submitted.");
      setTickets((current) => [payload.data!.ticket, ...current]);
      setTicketDraft((current) => ({ ...current, message: "", screenshot_url: "" }));
      setTicketMessage({ tone: "success", text: `Support request ${payload.data.ticket.ticket_number} submitted.` });
    } catch (error) {
      setTicketMessage({ tone: "error", text: error instanceof Error ? error.message : "Support request could not be submitted." });
    } finally {
      setBusy("");
    }
  }

  async function updateTicket(id: string, patch: Partial<SupportTicket>) {
    if (!canManage) return;
    setBusy(id);
    setTicketUpdateMessage(null);
    try {
      const response = await fetch(`/api/help/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await readApiPayload<{ ticket: SupportTicket }>(response);
      if (!response.ok || !payload.data?.ticket) throw new Error(payload.error || "Ticket update failed.");
      setTickets((current) => current.map((ticket) => (ticket.id === id ? payload.data!.ticket : ticket)));
      setTicketUpdateMessage({ tone: "success", text: `Request ${payload.data.ticket.ticket_number} updated.` });
    } catch (error) {
      setTicketUpdateMessage({ tone: "error", text: error instanceof Error ? error.message : "Request could not be updated. Try again." });
    } finally {
      setBusy("");
    }
  }

  async function handleScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 650 * 1024) {
      setTicketMessage({ tone: "error", text: "Screenshot must be under 650 KB." });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setTicketDraft((current) => ({ ...current, screenshot_url: dataUrl }));
    setTicketMessage({ tone: "success", text: "Screenshot attached." });
  }

  const guidePage=usePagination(filteredGuideCards,search+"|"+selectedCategory,3);
  const articlePage=usePagination(filteredArticles,search+"|"+selectedCategory,3);
  const ticketPage=usePagination(tickets,"tickets",3);
  const searchControls = (id: string) => <div className="help-search-controls">
    <div className="relative min-w-0"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4" /><label className="sr-only" htmlFor={`${id}-search`}>Search help articles</label><input id={`${id}-search`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search help…" className="min-h-11 w-full pl-9 pr-3" /></div>
    <SelectField label="Topic" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}><option>All</option>{HELP_CATEGORIES.map(category => <option key={category}>{category}</option>)}</SelectField>
  </div>;
  return <div className="support-workspace">
    <Workspace label="Support sections" value={supportView} onValueChange={setSupportView} hash>
      <WorkspaceSection id="guides" title="Quick guides" icon="help">
        <Panel><PanelHeader title={activeGuideId ? activeGuide.title : "How can we help?"} description={activeGuideId ? activeGuide.category : "Find a guide or choose a topic."} />
          {activeGuideId ? <div className="help-panel-body">
            <Button variant="secondary" onClick={() => setActiveGuideId(null)}><ArrowLeft size={18} />All guides</Button>
            <ol className="help-guide-steps">{activeGuide.steps.map((step,index) => <li key={step}><span>{index+1}</span><p>{step}</p></li>)}</ol>
            <Button variant="secondary" onClick={() => { setChatInput(`Help me with: ${activeGuide.title}`); setSupportView("assistant"); }}><Bot size={18} />Ask about this guide</Button>
          </div> : <><div className="help-panel-body">{searchControls("guides")}
            <div className="help-guide-list">{guidePage.items.map(card => { const Icon=card.icon; return <button key={card.id} type="button" className="help-guide-row" onClick={() => setActiveGuideId(card.id)}><span className="help-guide-icon"><Icon className="h-5 w-5" /></span><span><strong>{card.title}</strong><small>{card.category}</small></span><ChevronRight size={18} /></button>; })}</div>
            {!filteredGuideCards.length ? <p className="help-muted">No guides match. Try another topic or search.</p> : null}
          </div><Pagination {...guidePage}/></>}
        </Panel>
      </WorkspaceSection>
      <WorkspaceSection id="articles" title="Help articles" icon="catalog">
        <Panel><PanelHeader title="Help articles" description="Open an article to read its instructions." /><div className="help-panel-body">{searchControls("articles")}
          {articlePage.items.map(article => <details className="help-article" key={article.id}><summary><span><strong>{article.title}</strong><small>{article.category}</small></span><ChevronRight size={18} /></summary><p>{article.content}</p></details>)}
          {!filteredArticles.length ? <p className="help-muted">No articles match. Quick guides remain available.</p> : null}
        </div><Pagination {...articlePage}/></Panel>
      </WorkspaceSection>
      <WorkspaceSection id="setup" title="Resolve an issue" icon="settings">
        <Panel><PanelHeader title="Troubleshooting" description="Choose the issue to see its next steps." /><div className="help-panel-body">
          <SelectField label="Issue" value={activeTrouble} onChange={event => setActiveTrouble(event.target.value)}>{troubleshootingCards.map(card => <option key={card.title}>{card.title}</option>)}</SelectField>
          <div className="help-resolution"><h3>{activeTroubleshooting.title}</h3><p>{activeTroubleshooting.description}</p><p>{activeTroubleshooting.fix}</p></div>
          <details className="help-article"><summary><strong>Business setup checklist</strong><ChevronRight size={18}/></summary><ol className="help-checklist">{GETTING_STARTED_CHECKLIST.map(item => <li key={item}>{item}</li>)}</ol></details>
          <details className="help-article"><summary><strong>Connection status</strong><ChevronRight size={18}/></summary><p>{systemStatus.databaseConfigured ? "Database connection settings are present. This does not confirm a live connection." : "Database connection settings are missing. Contact your administrator."}</p></details>
        </div></Panel>
      </WorkspaceSection>
      <WorkspaceSection id="assistant" title="Ask a question" icon="ai"><Panel><PanelHeader title="Support assistant" description="On-device help. A compatible WebGPU browser and an initial model download are required." />
            <div className="grid gap-4 p-5 sm:p-6">
              {!aiStatus.enabled ? (
                <p className="rounded-card border border-amber-200/20 bg-amber-300/10 p-3 text-sm font-bold leading-6 text-amber-50">
                  Local AI is disabled. Help articles and support tickets remain available.
                </p>
              ) : null}
              <div className="support-chat-scroll grid gap-3 overflow-y-auto rounded-3xl border border-cyan-200/12 bg-slate-950/40 p-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === "user" ? "ml-auto max-w-[92%] rounded-card bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950" : "mr-auto max-w-[94%] rounded-card bg-white/[0.08] px-3 py-2 text-sm font-semibold text-teal-50/85"}
                  >
                    <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  </div>
                ))}
                {chatBusy ? <p className="text-sm font-bold text-cyan-100/70">{localProgress || "Preparing help context…"}</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="ai-support-question" className="sr-only">Ask AI Support question</label>
                <textarea
                  id="ai-support-question"
                  name="aiSupportQuestion"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className="min-h-24 w-full rounded-card border border-white/10 bg-slate-950/45 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-300"
                  placeholder="Ask about products, orders, WhatsApp, or billing."
                />
                <Button type="button" variant="primary" onClick={() => askSupport()} disabled={chatBusy || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                  Send question
                </Button>
              </div>
            </div>
      </Panel></WorkspaceSection>
      <WorkspaceSection id="requests" title="Contact support" icon="messages"><Panel><PanelHeader title="New support request" description="Describe the issue, confirm your contact details, then submit." /><div className="help-panel-body">
        <Workspace label="Request steps" value={requestStep} onValueChange={setRequestStep}>
          <WorkspaceSection id="issue" title="1. Describe the issue" icon="editor"><div className="grid gap-3">
              <SelectField id="support-issue-category" name="supportIssueCategory" label="Issue category" value={ticketDraft.issue_category} onChange={(event) => setTicketDraft({ ...ticketDraft, issue_category: event.target.value })}>
                {HELP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </SelectField>
              <SelectField id="support-priority" name="supportPriority" label="Priority" value={ticketDraft.priority} onChange={(event) => setTicketDraft({ ...ticketDraft, priority: event.target.value as SupportTicketPriority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </SelectField>
              <div className="grid gap-2"><label htmlFor="support-message" className="text-sm font-semibold">Message</label><textarea id="support-message" name="supportMessage" className="min-h-28 w-full p-3" value={ticketDraft.message} onChange={(event) => setTicketDraft({ ...ticketDraft, message: event.target.value })} placeholder="Tell us what happened and what you already tried." /></div>
          </div></WorkspaceSection>
          <WorkspaceSection id="contact" title="2. Contact details" icon="people"><div className="grid gap-3">
              <Field id="support-name" name="supportName" label="Name" value={ticketDraft.name} onChange={(event) => setTicketDraft({ ...ticketDraft, name: event.target.value })} />
              <Field id="support-email" name="supportEmail" label="Email" type="email" value={ticketDraft.email} onChange={(event) => setTicketDraft({ ...ticketDraft, email: event.target.value })} />
              <Field id="support-business-name" name="supportBusinessName" label="Business name" value={ticketDraft.business_name} onChange={(event) => setTicketDraft({ ...ticketDraft, business_name: event.target.value })} />
          </div></WorkspaceSection>
          <WorkspaceSection id="attachment" title="3. Screenshot (optional)" icon="photo"><div className="grid gap-3"><p className="help-muted">Attach a PNG or JPEG screenshot under 650 KB. Exclude passwords and payment credentials.</p>
              <label htmlFor="support-screenshot" className="grid gap-2 text-sm font-bold text-teal-50">
                <span className="text-teal-50/86">Screenshot upload</span>
                <input id="support-screenshot" name="supportScreenshot" type="file" accept="image/png,image/jpeg" onChange={handleScreenshot} className="rounded-card border border-white/10 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white" />
              </label>
              {ticketDraft.screenshot_url ? <Badge tone="green">Screenshot attached</Badge> : null}
          </div></WorkspaceSection>
        </Workspace>
        {ticketMessage ? <p role={ticketMessage.tone === "error" ? "alert" : "status"} className={`help-request-feedback ${ticketMessage.tone}`}>{ticketMessage.text}</p> : null}
        <Button onClick={submitTicket} disabled={busy === "ticket"}><Send size={18}/>{busy === "ticket" ? "Submitting…" : "Submit support request"}</Button>
      </div></Panel></WorkspaceSection>
      <WorkspaceSection id="history" title="Your requests" icon="orders"><Panel>{ticketUpdateMessage ? <p role={ticketUpdateMessage.tone === "error" ? "alert" : "status"} className={`help-request-feedback ${ticketUpdateMessage.tone}`}>{ticketUpdateMessage.text}</p> : null}<PanelHeader title="Support requests" description={canManage ? "Requests for this business." : "Your submitted requests."} action={<Badge tone="teal">{tickets.length}</Badge>}/>
            <div className="grid gap-3 p-5 sm:p-6">
              {tickets.length === 0 ? (
                <p className="rounded-card bg-black/20 p-3 text-sm font-bold text-teal-50/72">No support requests yet.</p>
              ) : null}
              {ticketPage.items.map((ticket) => (
                <details key={ticket.id} className="help-article">
                  <summary>
                    <div className="min-w-0">
                      <p className="font-black leading-tight text-white">{ticket.ticket_number}</p>
                      <p className="text-xs font-bold text-cyan-100/60">{ticket.issue_category}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
                      <Badge tone={statusTone[ticket.status]}>{labelize(ticket.status)}</Badge>
                    </div>
                  </summary>
                  <p className="text-sm font-semibold leading-6 text-teal-50/75">{ticket.message}</p>
                  {ticket.ai_summary ? (
                    <p className="rounded-card bg-white/[0.06] p-2 text-xs font-bold leading-5 text-cyan-100/72">
                      <Bot className="mr-1 inline h-3.5 w-3.5" />
                      {ticket.ai_summary}
                    </p>
                  ) : null}
                  {canManage ? (
                    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-1">
                      <label htmlFor={`ticket-status-${ticket.id}`} className="sr-only">Select status for {ticket.ticket_number}</label>
                      <select id={`ticket-status-${ticket.id}`} name={`ticketStatus-${ticket.id}`} value={ticket.status} onChange={(event) => updateTicket(ticket.id, { status: event.target.value as SupportTicketStatus })} disabled={busy === ticket.id} className="min-h-9 rounded-card border border-white/10 bg-slate-950/45 px-2 text-xs font-bold text-white">
                        {["new", "open", "waiting_on_customer", "resolved", "closed"].map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                      </select>
                      <label htmlFor={`ticket-priority-${ticket.id}`} className="sr-only">Select priority for {ticket.ticket_number}</label>
                      <select id={`ticket-priority-${ticket.id}`} name={`ticketPriority-${ticket.id}`} value={ticket.priority} onChange={(event) => updateTicket(ticket.id, { priority: event.target.value as SupportTicketPriority })} disabled={busy === ticket.id} className="min-h-9 rounded-card border border-white/10 bg-slate-950/45 px-2 text-xs font-bold text-white">
                        {["low", "medium", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{labelize(priority)}</option>)}
                      </select>
                    </div>
                  ) : null}
                </details>
              ))}
            </div>
        <Pagination {...ticketPage}/>
      </Panel></WorkspaceSection>
    </Workspace>
  </div>;
}
