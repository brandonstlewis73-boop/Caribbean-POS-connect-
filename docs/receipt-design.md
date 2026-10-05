# Thermal receipt design

PDF downloads from Orders, POS and Receipts use the same 80 mm layout. The saved logo retains its aspect ratio, with business name and contact details beneath it. Automatically generated “Location selected near” business addresses are omitted; configure a real business street address in Settings to print it. Shipping labels retain their existing layout.

The header identifies unpaid orders as ORDER RECEIPT and paid orders as PAYMENT RECEIPT. Dates are explicitly UTC. Quantity/name and line amount sit together, with unit price beneath. Subtotal, discounts, tax, service fee and delivery retain the saved order values; payment status is never modified by printing.

The roll length follows content height. Long item names wrap rather than truncate. HTTPS payment and directions links become labeled, clickable QR codes; raw URLs are not printed. Example-domain payment URLs, credential-bearing URLs and non-HTTPS links are omitted. The payment QR is displayed only for unpaid orders with a valid saved link; it does not create a payment integration.

Validation: typecheck and production build; PDF text/page checks for an unpaid order, paid order, long basket and invalid/example links. Synthetic sample PDF is under /workspace/receipt-preview. Physical printer scaling and QR scanning need a device check; choose 80 mm paper and actual size when printing.

## Business template tools

Open Printer & Receipts → Receipt templates, or use the Receipts page link. Choose Modern (centered/bold), Classic (monospace/dashed) or Minimal (compact/left-aligned), toggle the saved business logo and edit the footer. Preview PDF renders only a synthetic sample with the current business branding; it does not create an order or save preferences. Save receipt design writes only receipt_template, receipt_show_logo and receipt_message through authenticated business-scoped settings. Unknown template values fall back to Modern. Users without settings:write can view but cannot preview draft changes or save them. The preview response is private and not cached.

Template controls were tested with mocked APIs at 320, 390, 430, 768 and 1440 px, including exact save payload, unsaved state and preview without writes. Each template PDF was checked for unchanged totals and status.
