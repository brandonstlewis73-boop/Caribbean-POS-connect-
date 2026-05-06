import { OnlineOrderClient } from "@/components/orders/OnlineOrderClient";
import { getSettings, listProducts } from "@/lib/data";

export default async function OnlineOrderPage() {
  const [products, settings] = await Promise.all([listProducts(), getSettings()]);
  return <OnlineOrderClient products={products} settings={settings} />;
}
