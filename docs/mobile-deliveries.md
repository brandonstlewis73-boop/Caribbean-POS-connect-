# Mobile and delivery operations

Phone review used actual components with synthetic records and mocked APIs at 320, 390 and 430 px, plus tablet and desktop widths. Settings, inventory, orders, customers, AI, reports, POS and deliveries were checked. No production orders were created.

1. Navigation: closed drawer is inert and casts no shadow; Escape restores focus and scroll; orientation changes close it.
2. Forms: phone inputs are 16 px, branding tabs remain visible, and customer/checkout sheets keep actions reachable.
3. Content: order filters and report amounts wrap safely; inventory tables retain intentional scrolling on tablets.
4. Deliveries: status/search/driver filters, one-driver route suggestions, expandable order details, delivery confirmation, and recoverable request errors. Payment status is not changed by delivery completion. Driver detail editing requires orders:update; drivers retain navigation, contact and delivery status actions.

Route sequencing uses straight-line GPS distance from a saved business origin when available, otherwise the oldest GPS stop, followed by address areas. It does not calculate road times or traffic and is not an AI call. Cancelled and delivered orders are excluded from active routes.

Validation: route unit checks and mocked browser interaction checks. Screenshot evidence is stored in the workspace mobile-layout directory. Physical iPhone Safari and HEIC decoding still require device verification. This is not a full accessibility certification.
