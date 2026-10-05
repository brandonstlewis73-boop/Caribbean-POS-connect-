import type {Product,Settings} from './types';
export const roundSaleMoney=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
export function saleUnitPrice(product:Pick<Product,'selling_price'|'discount_price'>){
 const normal=Number(product.selling_price),sale=product.discount_price;
 return sale!=null&&Number.isFinite(Number(sale))&&Number(sale)>=0&&Number(sale)<=normal?Number(sale):normal;
}
export function saleTotals(cart:Array<Pick<Product,'selling_price'|'discount_price'>&{quantity:number;discount:number}>,settings:Settings,discount:number,deliveryFee:number){
 const subtotal=roundSaleMoney(cart.reduce((sum,item)=>sum+saleUnitPrice(item)*item.quantity,0));
 const discountTotal=roundSaleMoney(cart.reduce((sum,item)=>sum+item.discount,0)+discount);
 const taxable=Math.max(0,subtotal-discountTotal);
 const tax=settings.tax_enabled?roundSaleMoney(taxable*Number(settings.tax_rate)/100):0;
 const serviceFee=settings.service_fee_enabled?taxable*Number(settings.service_fee_rate)/100:0;
 return {subtotal,discountTotal,taxable,tax,serviceFee:roundSaleMoney(serviceFee),total:roundSaleMoney(taxable+tax+serviceFee+deliveryFee)};
}
export function availableSaleStock(product:Pick<Product,'stock_quantity'>){return Math.max(0,Math.floor(Number(product.stock_quantity)||0));}
export function normalizeSalePhone(phone:string){return phone.replace(/\D/g,'');}

export function paymentMethodEnabled(method: string, settings: Settings) {
  if (method === "Cash") return settings.payment_cash_enabled;
  if (method === "Card") return settings.payment_card_enabled;
  if (method === "Transfer" || method === "Bank transfer") return settings.payment_bank_enabled;
  if (method === "Digital Wallet") return settings.payment_wipay_enabled;
  if (method === "Split Payment") return false;
  if (method === "PayPal") return settings.payment_paypal_enabled;
  if (method === "WiPay") return settings.payment_wipay_enabled;
  if (method === "Pay on delivery") return settings.payment_pod_enabled;
  return false;
}

