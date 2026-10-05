export const RECEIPT_TEMPLATES = [
 {id:'modern',name:'Modern',description:'Bold totals, centered branding and clean separators.'},
 {id:'classic',name:'Classic',description:'Traditional monospace type and dashed separators.'},
 {id:'minimal',name:'Minimal',description:'Compact spacing, left-aligned branding and less decoration.'}
] as const;
export type ReceiptTemplate = typeof RECEIPT_TEMPLATES[number]['id'];
export function receiptTemplate(value: unknown): ReceiptTemplate {
 return RECEIPT_TEMPLATES.some(template=>template.id===value)?value as ReceiptTemplate:'modern';
}
