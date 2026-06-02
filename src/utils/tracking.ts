import { Order } from "../types";

/**
 * Generates an 8-digit deterministic numeric suffix based on Firestore order ID
 */
export function getOrderSuffix(id: string): string {
  if (!id) return "00000000";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const p1 = String(Math.abs(hash) % 10000).padStart(4, "0");
  const p2 = String(Math.abs(hash * 31) % 10000).padStart(4, "0");
  return `${p1}${p2}`;
}

/**
 * Generates a systematic, human-readable tracking number.
 * Format: BKA-240526-39140258
 */
export function getTrackingNumber(o: Order): string {
  // If a custom or saved tracking number already exists, preserve it if it fits format
  if (o.trackingNumber && o.trackingNumber.trim() && o.trackingNumber.includes("-")) {
    return o.trackingNumber;
  }

  const payMethod = (o.paymentMethod || "COD").toLowerCase();
  let prefix = "COD";
  if (payMethod.includes("bkash")) {
    prefix = "BKA";
  } else if (payMethod.includes("nagad")) {
    prefix = "NAG";
  }

  const d = new Date(o.time || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const dateStr = `${dd}${mm}${yy}`; // e.g. 240526

  const suffix = getOrderSuffix(o.id || "");

  return `${prefix}-${dateStr}-${suffix}`;
}

/**
 * Generates an order number with NO alphabetic letters and NO hyphens, strictly numeric.
 * Process: Converts standard prefix chars (BKA/NAG/COD) to alphabetical positions,
 * and appends the date and suffix.
 * - BKA (B=2, K=11, A=1) -> 2111
 * - NAG (N=14, A=1, G=7) -> 1417
 * - COD (C=3, O=15, D=4) -> 3154
 */
export function getOrderNumber(o: Order): string {
  const payMethod = (o.paymentMethod || "COD").toLowerCase();
  let prefixNum = "3154"; // Default for COD (C=3, O=15, D=4)
  if (payMethod.includes("bkash")) {
    prefixNum = "2111"; // BKA (B=2, K=11, A=1)
  } else if (payMethod.includes("nagad")) {
    prefixNum = "1417"; // NAG (N=14, A=1, G=7)
  }

  const d = new Date(o.time || Date.now());
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const dateStr = `${dd}${mm}${yy}`; // e.g. 240526

  const suffix = getOrderSuffix(o.id || "");

  return `${prefixNum}${dateStr}${suffix}`;
}

