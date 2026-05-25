import React, { useState, useEffect } from "react";
import { X, Printer, Check, RotateCcw, AlertTriangle, User, Phone, MapPin, Coins, ClipboardList, Eye, Building, Download, Loader2, Clipboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order, PaymentSettings } from "../types";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firestoreError";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getTrackingNumber, getOrderNumber } from "../utils/tracking";

interface InvoiceModalProps {
  orderId: string | null;
  orders: Order[];
  onClose: () => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ orderId, orders, onClose, addToast }) => {
  const order = orders.find((o) => o.id === orderId);

  // Local Editable States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [productPrice, setProductPrice] = useState<string | number>("");
  const [deliveryCharge, setDeliveryCharge] = useState<string | number>("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  const keepAndConvertEnglishDigits = (value: string): string => {
    const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    let cleanValue = "";
    let hasDecimal = false;
    for (let char of value) {
      const idx = banglaDigits.indexOf(char);
      if (idx !== -1) {
        cleanValue += idx;
      } else if (char >= "0" && char <= "9") {
        cleanValue += char;
      } else if (char === "." && !hasDecimal) {
        cleanValue += char;
        hasDecimal = true;
      }
    }
    return cleanValue;
  };

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          setPaymentSettings(docSnap.data() as any);
        }
      },
      (err) => {
        console.error("Failed to load invoice payment details", err);
      }
    );
    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const handlePrint = () => {
    try {
      // 1. Trigger window print
      window.print();
    } catch (err) {
      console.warn("Direct window.print() failed/blocked, opening manual print window:", err);
      
      const invoiceData = document.getElementById("printInvoiceArea")?.innerHTML;
      if (invoiceData) {
        const popup = window.open("", "_blank");
        if (popup) {
          popup.document.write(`
            <html>
              <head>
                <title>Print Invoice - SmartHaatBD</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  body { font-family: "Plus Jakarta Sans", sans-serif; padding: 20px; background-color: white; }
                  @media print {
                    body { padding: 0; }
                    @page {
                      size: A5 portrait;
                      margin: 0;
                    }
                  }
                </style>
              </head>
              <body>
                <div style="width: 148mm; height: 210mm; padding: 8mm; box-sizing: border-box; margin: 0 auto; border: none;">
                  ${invoiceData}
                </div>
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          popup.document.close();
        } else {
          addToast("error", "The browser has blocked the popup. Please open the app in a new tab to print.");
        }
      }
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("printInvoiceArea");
    if (!element) return;

    // Helper to replace OKLCH color notations with RGB/RGBA grayscale to prevent html2canvas parsing errors
    const replaceOklch = (str: string): string => {
      return str.replace(/oklch\s*\(([^)]+)\)/g, (_, p1) => {
        const parts = p1.trim().split(/[\s/]+/);
        const lightness = parseFloat(parts[0]);
        if (isNaN(lightness)) return 'rgb(120, 120, 120)';
        const hasAlpha = p1.includes('/');
        const alpha = hasAlpha ? parts[parts.length - 1] : '1';
        const val = Math.round(lightness * 255);
        return `rgba(${val}, ${val}, ${val}, ${alpha})`;
      });
    };

    const originalGetComputedStyle = window.getComputedStyle;

    try {
      setIsDownloading(true);
      addToast("info", "Generating high-quality PDF invoice...");

      // Temporarily mock getComputedStyle to intercept oklch color declarations
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle.call(this, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            const value = target[prop as any];
            if (typeof value === 'function') {
              if (prop === 'getPropertyValue') {
                return function(propertyName: string) {
                  const val = target.getPropertyValue(propertyName);
                  if (typeof val === 'string' && val.includes('oklch')) {
                    return replaceOklch(val);
                  }
                  return val;
                };
              }
              return value.bind(target);
            }
            if (typeof value === 'string' && value.includes('oklch')) {
              return replaceOklch(value);
            }
            return value;
          }
        });
      };

      const canvas = await html2canvas(element, {
        scale: 3, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const pdfWidth = 148;
      const pdfHeight = 210;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const fileName = `Invoice_${order.id || "order"}.pdf`;
      pdf.save(fileName);
      addToast("success", "PDF downloaded successfully! 📄");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      addToast("error", "Failed to generate PDF download.");
    } finally {
      // Restore dynamic styles interceptor
      window.getComputedStyle = originalGetComputedStyle;
      setIsDownloading(false);
    }
  };

  // Initialize Local states on modal open / order change
  useEffect(() => {
    if (order) {
      setCustomerName(order.customerName || "");
      setCustomerPhone(order.customerPhone || "");
      setCustomerAddress(order.customerAddress || "");
      setProductPrice(order.productPrice !== undefined ? String(order.productPrice) : "0");
      setDeliveryCharge(order.deliveryCharge !== undefined ? String(order.deliveryCharge) : "0");
      setTrackingNumber(getTrackingNumber(order));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (!order) return null;

  const handleUpdateDatabase = async () => {
    if (!customerName.trim()) return addToast("error", "Name cannot be empty");
    if (!customerPhone.trim()) return addToast("error", "Phone cannot be empty");
    if (!customerAddress.trim()) return addToast("error", "Address cannot be empty");

    try {
      setSaving(true);
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        productPrice: Number(productPrice),
        deliveryCharge: Number(deliveryCharge),
        trackingNumber: trackingNumber.trim(),
      });
      addToast("success", "Order details updated live in Cloud Database! 🎉");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      addToast("error", "Could not save database edits. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (newStatus: "Pending" | "Delivered") => {
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { status: newStatus });
      addToast("success", `Order updated status to: ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      addToast("error", "Failed to update delivery state.");
    }
  };

  const subtotalNum = Number(productPrice) || 0;
  const deliveryNum = Number(deliveryCharge) || 0;
  const totals = {
    subtotal: subtotalNum,
    delivery: deliveryNum,
    grandTotal: subtotalNum + deliveryNum,
  };

  const formattedDate = new Date(order.time).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const finalTrackingNo = trackingNumber.trim() || getTrackingNumber(order);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(finalTrackingNo)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      
      {/* Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl max-w-4xl w-full p-6 relative shadow-xl my-8 no-print border border-slate-100"
      >
        {/* Close Button on Modal top-right edge */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer no-print"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <h3 className="text-base font-bold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2 no-print">
          <ClipboardList className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>Order Invoice Manager</span>
        </h3>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Edit Form (Left column span-2) */}
          <div className="lg:col-span-2 space-y-4 bg-slate-50/50 p-4 border border-slate-200/60 rounded-xl max-h-[500px] overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <span>Modify Details</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Customer Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Order Tracking ID</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. DEX-BDN-0109240258"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-indigo-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white bg-indigo-50/20 tracking-wider transition font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Shipping / Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition resize-none leading-relaxed font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Price (৳)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    value={productPrice}
                    onChange={(e) => setProductPrice(keepAndConvertEnglishDigits(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Delivery (৳)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(keepAndConvertEnglishDigits(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-bold"
                  />
                  {paymentSettings && (paymentSettings.deliveryInside !== undefined || paymentSettings.deliveryOutside !== undefined) && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {paymentSettings.deliveryInside !== undefined && (
                        <button
                          type="button"
                          onClick={() => setDeliveryCharge(paymentSettings.deliveryInside!)}
                          className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition cursor-pointer select-none border border-emerald-200/50"
                        >
                          Inside (৳{paymentSettings.deliveryInside})
                        </button>
                      )}
                      {paymentSettings.deliveryOutside !== undefined && (
                        <button
                          type="button"
                          onClick={() => setDeliveryCharge(paymentSettings.deliveryOutside!)}
                          className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition cursor-pointer select-none border border-blue-200/50"
                        >
                          Outside (৳{paymentSettings.deliveryOutside})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Diagnostics on Edit Panel */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Payment Diagnostics</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Payment Method:</span>
                  <span className="font-extrabold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">{order.paymentMethod || "COD"}</span>
                </div>
                {order.paymentMethod?.toLowerCase() !== "cod" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Advance Payment:</span>
                    <span className="font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded text-[9px] uppercase border border-amber-100/50">Advance Paid</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Payment Type:</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded text-[9px] uppercase border border-blue-100/50">Cash On Delivery</span>
                  </div>
                )}
                {order.transactionId && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <span className="text-slate-500 font-semibold">Transaction ID:</span>
                    <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border text-slate-600 font-bold select-all text-[10px]">{order.transactionId}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleUpdateDatabase}
              disabled={saving}
              className={`w-full text-xs font-bold py-2.5 rounded-xl text-white shadow-xs transition cursor-pointer mt-3 flex items-center justify-center gap-1 bg-[#0f172a] hover:bg-[#1e293b]`}
            >
              {saving ? "Updating cloud..." : "Save changes to DB"}
            </button>
          </div>

          {/* Interactive Invoice preview (Right column span-3) */}
          <div className="lg:col-span-3 flex justify-center bg-slate-100 p-4 rounded-2xl border border-slate-100/50 max-h-[520px] overflow-y-auto relative">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                }
                .no-print {
                  display: none !important;
                }
                #printInvoiceArea {
                  width: 148mm !important;
                  height: 210mm !important;
                  max-height: 210mm !important;
                  min-height: 210mm !important;
                  padding: 8mm !important;
                  margin: 0 auto !important;
                  box-sizing: border-box !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  overflow: hidden !important;
                }
                @page {
                  size: A5 portrait;
                  margin: 0;
                }
              }
            `}} />
            
            <div
              id="printInvoiceArea"
              className="w-full max-w-[148mm] min-h-[210mm] border border-slate-200 p-6 rounded-xl bg-white shadow-sm"
            >
              {/* Invoice Top Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3 select-none">
              <div>
                <h1 className="text-lg font-black tracking-wider text-slate-900 uppercase">SmartHaatBD</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Premium E-Commerce Platform</p>
              </div>
              <div className="text-right">
                <h2 className="text-xs font-extrabold text-emerald-600 tracking-wider uppercase bg-emerald-50 px-2 py-0.5 rounded-md inline-block">Retail Invoice</h2>
                <p className="text-[10px] font-mono text-slate-500 mt-1.5">{formattedDate}</p>
              </div>
            </div>

            {/* Split Info rows */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 pb-4 border-b border-dashed border-slate-200">
              
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Billing / Shipping To:</span>
                <p className="font-extrabold text-slate-800">{customerName || "N/A"}</p>
                <p className="text-slate-600 font-mono text-[11px]">{customerPhone || "N/A"}</p>
                <p className="text-slate-500 mt-1 leading-normal text-[10px] break-words">{customerAddress || "N/A"}</p>
              </div>

              <div className="flex flex-col justify-between items-end">
                <div className="text-right">
                  <span className="text-slate-400 font-bold uppercase text-[9px] block">Order ID:</span>
                  <p className="font-mono text-[12px] text-emerald-700 font-black select-all mb-1 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 inline-block">{getOrderNumber(order)}</p>

                  <span className="text-slate-400 font-bold uppercase text-[9px] block mt-1">Order Tracking No:</span>
                  <p className="font-mono text-[11px] text-slate-900 font-extrabold select-all mb-1 bg-slate-100 hover:bg-slate-200/60 border border-slate-200 rounded-md px-2 py-0.5 inline-block">{finalTrackingNo}</p>
                  <span className="text-slate-400 text-[8px] block select-all font-mono">System ID: #{order.id.toUpperCase()}</span>
                  <div className="text-[10px] font-bold space-y-1 mt-1.5">
                    <div>
                      Courier Status:{" "}
                      <span
                        className={`font-black uppercase text-[9px] px-1.5 py-0.5 rounded ${
                          order.status === "Delivered"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : "text-amber-700 bg-amber-50 border border-amber-200"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div>
                      Payment:{" "}
                      <span className="text-[10px] uppercase font-bold text-slate-700">
                        {order.paymentMethod || "COD"}
                      </span>
                    </div>
                    <div>
                      {order.paymentMethod?.toLowerCase() !== "cod" ? (
                        <span className="text-purple-700 bg-purple-50/80 text-purple-700 uppercase text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-purple-200/60 inline-block mt-0.5">
                          PREPAID (MFS)
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-50/80 text-red-700 uppercase text-[8.5px] font-extrabold px-1.5 py-0.5 rounded border border-red-200/60 inline-block mt-0.5">
                          CASH ON DELIVERY (COD)
                        </span>
                      )}
                    </div>
                    {order.transactionId && (
                      <div className="text-[9px] font-mono font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded inline-block">
                        TxID: {order.transactionId}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Dynamic QR Code */}
                <div className="mt-2 text-right">
                  <img
                    id="invQRCode"
                    src={qrCodeUrl}
                    alt="Invoice QR Code"
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-contain ml-auto rounded border border-slate-100 p-0.5 bg-white mix-blend-multiply transition hover:scale-105 duration-200"
                  />
                  <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-wider text-right">Scan Invoice</p>
                </div>
              </div>

            </div>

            {/* Dynamic visual barcode and COD highlight banner */}
            {order.paymentMethod?.toLowerCase() !== "cod" ? (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 mb-5 text-center select-none">
                <p className="text-[10px] font-black tracking-widest text-emerald-800 uppercase">Attention Warehouse & Delivery Agent</p>
                <p className="text-xl font-black text-emerald-700 tracking-tight mt-0.5">PREPAID IN FULL (MFS)</p>
                <div className="bg-emerald-100/75 border border-emerald-200 text-emerald-800 max-w-sm mx-auto rounded-lg py-1 px-3 mt-2 text-xs font-bold leading-normal">
                  DO NOT COLLECT CASH AT DOORSTEP
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-5 text-center select-none">
                <p className="text-[10px] font-black tracking-widest text-red-800 uppercase">Attention Warehouse & Delivery Agent</p>
                <p className="text-2xl font-black text-red-700 tracking-tight mt-0.5">CASH ON DELIVERY (COD)</p>
                <div className="bg-red-100/75 border border-red-200 text-red-800 max-w-sm mx-auto rounded-lg py-2 px-3 mt-2 text-xs font-black leading-normal">
                  COLLECT FULL AMOUNT FROM CUSTOMER:
                  <div className="text-base text-red-900 font-extrabold mt-0.5">৳{(Number(order.productPrice || 0) + Number(order.deliveryCharge || 0)).toLocaleString()} BDT</div>
                </div>
              </div>
            )}

            {/* Barcode representation */}
            <div className="flex flex-col items-center justify-center py-3 border-y border-dashed border-slate-200 my-4 select-none">
              <img
                src={`https://quickchart.io/barcode?type=code128&text=${encodeURIComponent(finalTrackingNo)}&width=280&height=50&showText=false`}
                alt="Barcode"
                referrerPolicy="no-referrer"
                className="h-12 w-auto object-contain mix-blend-multiply"
              />
              <span className="font-mono text-[9px] font-bold text-slate-500 tracking-widest mt-1">*{finalTrackingNo}*</span>
            </div>

            {/* Goods item table */}
            <table className="w-full text-left text-xs mb-4">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-wider font-extrabold select-none">
                  <th className="p-2 rounded-l-lg">Product Description</th>
                  <th className="p-2 text-center w-16">Qty</th>
                  <th className="p-2 text-right rounded-r-lg w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-2.5 font-bold text-slate-800 max-w-[180px] break-words">
                    {order.productName}
                  </td>
                  <td className="p-2.5 text-center text-slate-600 font-mono">1</td>
                  <td className="p-2.5 text-right font-semibold text-slate-800 font-mono">
                    ৳{totals.subtotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Invoicing summary rows */}
            <div className="w-2/3 ml-auto text-xs space-y-1.5 border-t border-slate-100 pt-2 font-medium">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal Value:</span>
                <span className="font-mono">৳{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery / Courier charge:</span>
                <span className="font-mono">৳{totals.delivery.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-950 border-t border-slate-100 pt-2 bg-slate-50 px-2 py-1.5 rounded-xl">
                <span>Total Payable BDT:</span>
                <span className="text-emerald-600 font-mono">৳{totals.grandTotal.toLocaleString()}</span>
              </div>
            </div>



            {/* Corporate Invoice Footer */}
            <div className="mt-8 border-t border-slate-100 pt-3 text-[9px] text-slate-400 text-center tracking-wide italic">
              Thank you for shopping with SmartHaatBD! For any support or dispatch inquiries, check settings gateway.
            </div>

          </div>

        </div>

      </div>



        {/* Modal Action Controls footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap justify-end gap-3 no-print">
          <button
            onClick={onClose}
            className="border border-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className={`font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              isDownloading 
                ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-extrabold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>

          {order.status === "Pending" ? (
            <button
              onClick={() => handleToggleStatus("Delivered")}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Mark as Delivered</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus("Pending")}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Mark as Pending</span>
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
};
