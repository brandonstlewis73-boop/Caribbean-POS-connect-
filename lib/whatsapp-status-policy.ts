import type { Order, Settings } from "./types";
export function customerWhatsAppEnabled(status:Order["status"],settings:Settings) {
  if(!settings.whatsapp_enabled)return false;
  if(status==="new")return settings.whatsapp_customer_confirmations_enabled;
  if(status==="completed")return settings.whatsapp_customer_receipts_enabled || settings.receipt_whatsapp_enabled;
  if(status==="out_for_delivery")return settings.whatsapp_out_for_delivery_enabled;
  return settings.notification_whatsapp_enabled;
}
