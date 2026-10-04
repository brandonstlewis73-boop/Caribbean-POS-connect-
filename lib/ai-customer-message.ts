import type { LocalGeneration } from './local-ai-config';

export function prepareCustomerMessage(prompt: string, facts: {
  businessName: string;
  products: { name: string; priceText: string }[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  catalogRequested: boolean;
}): LocalGeneration {
  const products = facts.products.slice(0, 5);
  return {
    purpose: 'customer-message',
    customerMessageFacts: { products, pickupEnabled: facts.pickupEnabled, deliveryEnabled: facts.deliveryEnabled, catalogRequested: facts.catalogRequested },
    instructions: `Write a short WhatsApp reply from the business to its customer. Output only the reply.
For availability questions, name a few of the available products and their exact saved prices, then ask which items the customer wants. Do not ask whether they want the list they already requested.
Use only the provided public facts. The catalog is a short selection, not necessarily the complete menu.
Do not invent products, prices, opening hours, ready times, discounts, or order status.
Offer pickup or delivery only when enabled. Availability does not mean an order is already prepared.
If no available products are provided, explain that availability needs checking; do not invent a menu.
Do not include sales reports, revenue, profit, costs, margins, other customers' records, stock counts, internal notes, or headings.
Do not ask for personal details before the customer has chosen items. Never claim a message was sent or an order was placed.`,
    input: `User request:\n${prompt.slice(0, 1800)}\n\nPublic business facts:\nBusiness: ${facts.businessName}\nPickup: ${facts.pickupEnabled ? 'Offered' : 'Not offered'}\nDelivery: ${facts.deliveryEnabled ? 'Offered' : 'Not offered'}\nA selection of available catalog items:\n${products.length ? products.map(product => `${product.name} — ${product.priceText}`).join('\n') : 'No available items provided'}`
  };
}
