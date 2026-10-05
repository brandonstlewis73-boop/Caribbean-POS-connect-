import { readFile } from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { money } from "./constants";
import { receiptLink, renderReceiptPdf } from "./receipt-layout";
import { getBusinessSettings, getReceiptNumber } from "./data";
import { buildAddress } from "./waze";
import type { CustomerInput, Order, Settings } from "./types";

const MAX_RECEIPT_LOGO_BYTES = 2 * 1024 * 1024;

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
      margin: 4,
      errorCorrectionLevel: "M"
    });
  } catch {
    return null;
  }
}

async function createLogoBuffer(logoUrl?: string | null) {
  const value = logoUrl?.trim();
  if (!value || value.toLowerCase().endsWith(".svg")) return null;

  if (value.startsWith("data:image/")) {
    const [metadata, base64Data] = value.split(",", 2);
    if (!base64Data || !/^data:image\/(png|jpe?g);base64$/i.test(metadata)) return null;
    const buffer = Buffer.from(base64Data.replace(/\s/g, ""), "base64");
    return buffer.length <= MAX_RECEIPT_LOGO_BYTES ? buffer : null;
  }

  if (value.startsWith("/") && /\.(png|jpe?g)$/i.test(value)) {
    try {
      const buffer = await readFile(path.join(process.cwd(), "public", value));
      return buffer.length <= MAX_RECEIPT_LOGO_BYTES ? buffer : null;
    } catch {
      return null;
    }
  }
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const response = await fetch(value);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!/^image\/(png|jpe?g)$/i.test(contentType)) return null;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_RECEIPT_LOGO_BYTES) return null;
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

function drawCenteredLogo(doc: PDFKit.PDFDocument, logoBuffer: Buffer | null, width = 52) {
  if (!logoBuffer) return;
  try {
    const x = doc.page.width / 2 - width / 2;
    doc.image(logoBuffer, x, doc.y, { fit: [width, width] });
    doc.y += width + 6;
  } catch {
    // Unsupported or corrupt logos should never block receipt generation.
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
  const [settings, receiptNumber] = await Promise.all([getBusinessSettings(order.business_id), getReceiptNumber(order.id)]);
  const paymentLink = order.payment_status === "unpaid" ? receiptLink(order.payment_link) : null;
  const navigationLink = receiptLink(order.waze_link);
  const [logo, paymentQr, navigationQr] = await Promise.all([
    createLogoBuffer(settings.logo_url), createQrBuffer(paymentLink, 240), createQrBuffer(navigationLink, 240)
  ]);
  return renderReceiptPdf(order, settings, receiptNumber, {logo, paymentQr, navigationQr});
}

export async function createReceiptPreviewPdfBuffer(settings: Settings) {
  const order = {id:"preview",order_number:"PREVIEW",created_at:new Date().toISOString(),order_type:"pickup",customer_snapshot:{name:"Sample customer"},items:[{id:"preview-item",quantity:2,product_name:"Sample product",unit_price:30,line_total:60}],subtotal:60,total:60,discount_total:0,tax_total:0,service_fee:0,delivery_fee:0,payment_method:"Cash",payment_status:"unpaid"} as Order;
  return renderReceiptPdf(order,settings,"PREVIEW",{logo:settings.receipt_show_logo === false ? null : await createLogoBuffer(settings.logo_url),preview:true});
}

export async function createShippingLabelPdfBuffer(order: Order) {
  const settings = await getBusinessSettings(order.business_id);
  const doc = new PDFDocument({ size: [288, 432], margin: 18 });
  const done = pdfToBuffer(doc);
  const wazeQr = await createQrBuffer(order.waze_link, 132);
  const logoBuffer = await createLogoBuffer(settings.logo_url);
  const address = customerAddress(order.customer_snapshot);
  const customer = order.customer_snapshot;

  drawCenteredLogo(doc, logoBuffer, 44);
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
