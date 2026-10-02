import { AppShell } from "@/components/layout/AppShell";
import { LocalAiTestClient } from "@/components/ai/LocalAiTestClient";
import { requirePagePermission } from "@/lib/page-auth";
import { localAiEnabled } from "@/lib/local-ai-config";
export default async function LocalAiTestPage() {
  const user = await requirePagePermission("settings:write");
  return <AppShell active="AI Tools" title="Local AI Test" user={user}>
    {localAiEnabled() ? <LocalAiTestClient /> : <p>Local AI is disabled.</p>}
  </AppShell>;
}
