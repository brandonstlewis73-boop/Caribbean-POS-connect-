export const dynamic = "force-dynamic";
export const revalidate = 0;

import { OnlineOrderClient } from "@/components/orders/OnlineOrderClient";
import { defaultSettings } from "@/lib/data";

export default function OnlineOrderPage() {
  return (
    <OnlineOrderClient
      products={[]}
      settings={defaultSettings}
      initialStatusMessage="Loading online menu..."
    />
  );
}
