import { OnlineOrderClient } from "@/components/orders/OnlineOrderClient";
import { defaultSettings } from "@/lib/data";
import type { Product } from "@/lib/types";
export default function Page() {
  const products = Array.from({ length: 15 }, (_, i) => ({
    id: `p${i + 1}`,
    name:
      i === 0
        ? "Strawberry Swirl Brownie"
        : i === 1
          ? "Sold out cookie"
          : `Bakery selection ${i + 1}`,
    selling_price: 60,
    discount_price: i === 0 ? 50 : null,
    stock_quantity: i === 1 ? 0 : 4,
    active: true,
    image_url:
      i % 3 === 0
        ? "/marketing/bread.jpg"
        : i % 3 === 1
          ? "/marketing/coffee.jpg"
          : "/marketing/juice.jpg",
    sku: `SKU${i + 1}`,
    description:
      "Fresh bakery selection. See the merchant for ingredient information.",
  })) as Product[];
  return (
    <OnlineOrderClient
      products={products}
      categories={[]}
      settings={{
        ...defaultSettings,
        business_name: "Baker Buds",
        currency: "TTD",
        storefront_3d_enabled: true,
        storefront_status: "live",
        pickup_enabled: true,
        delivery_enabled: true,
        payment_cash_enabled: true,
        tax_enabled: false,
        service_fee_enabled: false,
      }}
      immersiveEnabled
      refreshOnMount={false}
    />
  );
}
