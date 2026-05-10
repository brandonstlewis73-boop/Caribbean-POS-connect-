import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { money } from "./constants";
import { getReceiptNumber, getSettings } from "./data";
import { buildAddress } from "./waze";
import type { CustomerInput, Order } from "./types";

function pdfToBuffer(doc: PDFKit.PDFDocument) {
  const chunks: Buffer[] = [];

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  return done;
}

async function createQrBuffer(value?: string | null, width = 110) {
  if (!value) return null;
  try {
    return await QRCode.toBuffer(value, {
      type: "png",
      width,
      margin: 1,
      errorCorrectionLevel: "M"
    });
  } catch {
    return null;
  }
}

function customerAddress(customer: CustomerInput) {
  return buildAddress([
    customer.street_address,
    customer.city,
    customer.region,
    customer.country || "Trinidad and Tobago"
  ]);
}

export async function createReceiptPdfBuffer(order: Order) {
  const [settings, receiptNumber] = await Promise.all([getSettings(), getReceiptNumber(order.id)]);
  const doc = new PDFDocument({ size: [240, 720], margin: 18 });
  const done = pdfToBuffer(doc);
  const wazeQr = await createQrBuffer(order.waze_link);

  doc.fontSize(13).text(settings.business_name, { align: "center" });
  doc.fontSize(8).text(settings.business_phone, { align: "center" });
  doc.text(settings.business_email, { align: "center" });
  doc.text(settings.business_address, { align: "center" });
  doc.moveDown();
  doc.fontSize(9).text(`Receipt: ${receiptNumber || order.order_number}`);
  doc.text(`Order: ${order.order_number}`);
  doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`);
  doc.text(`Customer: ${order.customer_snapshot.name || "Walk-in customer"}`);
  doc.moveDown();

  for (const item of order.items) {
    doc.fontSize(9).text(`${item.quantity} x ${item.product_name}`);
    doc.fontSize(8).text(`${money(item.unit_price, settings.currency)} each  ${money(item.line_total, settings.currency)}`, {
      align: "right"
    });
  }

  doc.moveDown();
  doc.fontSize(9).text(`Subtotal: ${money(order.subtotal, settings.currency)}`, { align: "right" });
  if (order.discount_total) doc.text(`Discount: -${money(order.discount_total, settings.currency)}`, { align: "right" });
  if (order.tax_total) doc.text(`Tax/Fee: ${money(order.tax_total, settings.currency)}`, { align: "right" });
  if (order.delivery_fee) doc.text(`Delivery: ${money(order.delivery_fee, settings.currency)}`, { align: "right" });
  doc.fontSize(12).text(`Total: ${money(order.total, settings.currency)}`, { align: "right" });
  doc.moveDown();
  doc.fontSize(9).text(`Payment: ${order.payment_method}`);
  doc.text(`Status: ${order.payment_status}`);
  if (order.payment_link) {
    doc.text(`Payment link: ${order.payment_link}`);
  }
  if (order.waze_link) {
    doc.text(`Waze: ${order.waze_link}`);
    if (wazeQr) {
      doc.moveDown(0.5);
      doc.fontSize(8).text("Scan for Waze navigation", { align: "center" });
      doc.image(wazeQr, doc.page.width / 2 - 45, doc.y + 4, { width: 90 });
      doc.y += 98;
    }
  }
  if (order.loyalty_points_earned) {
    doc.text(`Loyalty earned: ${order.loyalty_points_earned} points`);
  }
  doc.moveDown();
  doc.text(settings.receipt_message, { align: "center" });
  doc.end();

  return done;
}

export async function createShippingLabelPdfBuffer(order: Order) {
  const settings = await getSettings();
  const doc = new PDFDocument({ size: [288, 432], margin: 18 });
  const done = pdfToBuffer(doc);
  const wazeQr = await createQrBuffer(order.waze_link, 132);
  const address = customerAddress(order.customer_snapshot);
  const customer = order.customer_snapshot;

  doc.fontSize(8).font("Helvetica-Bold").text(settings.business_name.toUpperCase(), { align: "center" });
  doc.fontSize(7).font("Helvetica").text(settings.business_phone, { align: "center" });
  doc.text(settings.business_address, { align: "center" });
  doc.moveDown(0.6);
  doc.moveTo(18, doc.y).lineTo(270, doc.y).stroke();
  doc.moveDown(0.8);

  doc.fontSize(11).font("Helvetica-Bold").text(`DELIVERY LABEL - ORDER #${order.order_number}`);
  doc.fontSize(8).font("Helvetica").text(`Created: ${new Date(order.created_at).toLocaleString()}`);
  doc.text(`Payment: ${order.payment_status.toUpperCase()} - ${order.payment_method}`);
  doc.text(`Total: ${money(order.total, settings.currency)}`);
  doc.moveDown(0.8);

  doc.fontSize(8).font("Helvetica-Bold").text("SHIP TO");
  doc.fontSize(15).text(customer.name || "Customer");
  doc.fontSize(9).font("Helvetica").text(customer.phone || "No phone");
  doc.moveDown(0.4);
  doc.fontSize(10).font("Helvetica-Bold").text(address || "Pickup / no delivery address", {
    width: 160
  });
  if (customer.delivery_notes) {
    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").text(`Instructions: ${customer.delivery_notes}`, { width: 160 });
  }

  if (wazeQr) {
    doc.image(wazeQr, 188, 142, { width: 82 });
    doc.fontSize(7).font("Helvetica-Bold").text("SCAN WAZE", 188, 226, { width: 82, align: "center" });
  }

  doc.moveDown(1);
  doc.moveTo(18, 285).lineTo(270, 285).stroke();
  doc.fontSize(8).font("Helvetica-Bold").text("ITEMS", 18, 296);
  doc.font("Helvetica");
  const itemSummary = order.items
    .map((item) => `${item.quantity} x ${item.product_name}`)
    .join("  |  ");
  doc.fontSize(8).text(itemSummary || "No items", {
    width: 252,
    height: 54,
    ellipsis: true
  });

  doc.moveTo(18, 360).lineTo(270, 360).stroke();
  doc.fontSize(8).font("Helvetica-Bold").text(`Driver: ${order.assigned_driver_name || "Unassigned"}`, 18, 372);
  doc.font("Helvetica").text(`Delivery status: ${order.delivery_status.replaceAll("_", " ")}`);
  if (order.waze_link) {
    doc.fontSize(6).text(order.waze_link, { width: 252, ellipsis: true });
  }

  doc.end();
  return done;
}
