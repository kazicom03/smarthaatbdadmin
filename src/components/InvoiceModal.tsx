import React, { useState, useEffect } from "react";
import { X, Printer, Check, RotateCcw, User, Phone, MapPin, ClipboardList, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { Order, PaymentSettings } from "../types";
import { db } from "../firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firestoreError";
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
  const [size, setSize] = useState("");
  const [saving, setSaving] = useState(false);
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

  const handlePrint = () => {
    try {
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
                <title>Invoice - SmartHaatBD</title>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  body { font-family: "Plus Jakarta Sans", sans-serif; padding: 0; margin: 0; background-color: white; }
                  @media print {
                    @page {
                      size: A5 portrait;
                      margin: 0;
                    }
                  }
                </style>
              </head>
              <body>
                <div style="width: 148mm; height: 210mm; padding: 6mm; box-sizing: border-box; margin: 0 auto;">
                  ${invoiceData}
                </div>
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                    }, 300);
                  };
                </script>
              </body>
            </html>
          `);
          popup.document.close();
        } else {
          addToast("error", "The browser blocked the print popup. Try opening the app in a new tab.");
        }
      }
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
      setSize(order.size || order.selectedSize || "");
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
        size: size.trim(),
        selectedSize: size.trim(),
      });
      addToast("success", "Order updated in database successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      addToast("error", "Could not save edits. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (newStatus: "Pending" | "Delivered") => {
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { status: newStatus });
      addToast("success", `Order state updated: ${newStatus}`);
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(finalTrackingNo)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      
      {/* Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-2xl max-w-5xl w-full p-5 relative shadow-xl my-4 border border-slate-150"
      >
        {/* Close Button on Modal top-right edge */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer no-print focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <h3 className="text-sm font-bold text-slate-850 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2 no-print">
          <ClipboardList className="w-4.5 h-4.5 text-slate-700 shrink-0" />
          <span>Invoice & Memo Manager</span>
        </h3>

        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Edit Form (Left column span-5) */}
          <div className="lg:col-span-5 no-print space-y-3.5 bg-slate-50/50 p-4 border border-slate-200/65 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Update Order Actions</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Customer Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-medium"
                  />
                </div>
              </div>



              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Shipping / Delivery Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={2}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition resize-none leading-relaxed font-medium"
                  />
                </div>
              </div>



              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Price (৳)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    value={productPrice}
                    onChange={(e) => setProductPrice(keepAndConvertEnglishDigits(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Delivery (৳)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(keepAndConvertEnglishDigits(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white bg-white transition font-mono font-bold"
                  />
                  {paymentSettings && (paymentSettings.deliveryInside !== undefined || paymentSettings.deliveryOutside !== undefined) && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {paymentSettings.deliveryInside !== undefined && (
                        <button
                          type="button"
                          onClick={() => setDeliveryCharge(paymentSettings.deliveryInside!)}
                          className="text-[8px] font-bold px-1 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition cursor-pointer select-none border border-emerald-200/50"
                        >
                          In (৳{paymentSettings.deliveryInside})
                        </button>
                      )}
                      {paymentSettings.deliveryOutside !== undefined && (
                        <button
                          type="button"
                          onClick={() => setDeliveryCharge(paymentSettings.deliveryOutside!)}
                          className="text-[8px] font-bold px-1 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition cursor-pointer select-none border border-blue-200/50"
                        >
                          Out (৳{paymentSettings.deliveryOutside})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="bg-white p-3 rounded-lg border border-slate-150 text-[11px] space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Payment Details</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Payment Method:</span>
                  <span className="font-extrabold text-slate-800 uppercase bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px]">{order.paymentMethod || "COD"}</span>
                </div>
                {order.paymentMethod?.toLowerCase() !== "cod" ? (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Advance Payment:</span>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded text-[9px] uppercase border border-emerald-100/50 text-[8px]">Paid</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Advance Status:</span>
                    <span className="font-bold text-red-600 bg-red-50/80 px-2 py-0.2 rounded text-[9px] uppercase border border-red-100/50 text-[8px]">Cash on Delivery</span>
                  </div>
                )}
                {order.transactionId && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <span className="text-slate-500 font-semibold text-[10px]">TxID:</span>
                    <span className="font-mono bg-slate-50 px-1 py-0.2 rounded border text-slate-600 font-semibold select-all text-[9px]">{order.transactionId}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleUpdateDatabase}
              disabled={saving}
              className="w-full text-xs font-bold py-2 rounded-xl text-white shadow-xs transition cursor-pointer mt-1 flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Database...</span>
                </>
              ) : (
                "Save changes to DB"
              )}
            </button>
          </div>

          {/* Elegant Page-Saving Invoice Preview (Right column span-7) */}
          <div className="lg:col-span-7 flex flex-col items-center bg-slate-100/70 p-4 rounded-xl border border-slate-200/50 max-h-[520px] overflow-y-auto relative shadow-inner">
            
            {/* Embedded styles specifically tailored for A5 portrait formatting */}
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
                  padding: 8mm 8mm !important;
                  margin: 0 !important;
                  box-sizing: border-box !important;
                  border: none !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  overflow: hidden !important;
                  background-color: white !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                @page {
                  size: A5 portrait;
                  margin: 0;
                }
              }
            `}} />

            {/* A5 Mock Layout Wrapper */}
            <div
              id="printInvoiceArea"
              style={{ width: "148mm", height: "210mm", minHeight: "210mm", maxHeight: "210mm" }}
              className="border border-slate-200 p-6 rounded-lg bg-white shadow-md flex flex-col justify-between box-border text-slate-800 shrink-0 select-none overflow-hidden relative"
            >
              <div>
                {/* Decorative Frame */}
                <div className="absolute inset-1.5 border border-slate-200 pointer-events-none rounded-lg opacity-40"></div>
                
                {/* 1. Header Section */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-2 relative z-10">
                  <div>
                    <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">SmartHaatBD</h1>
                    <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Premium E-Commerce Platform</p>
                    <p className="text-[8px] font-semibold text-slate-500 mt-1 max-w-[210px] leading-tight select-all">
                      📍 {paymentSettings?.footerOfficeAddress || "B-2/2, Anandapur, Genda, Savar, Dhaka"}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-black text-white tracking-widest uppercase bg-slate-900 px-2.5 py-0.5 rounded">
                      CASH MEMO / ক্যাশ মেমো
                    </span>
                    <p className="text-[8.5px] font-mono text-slate-400 font-bold mt-1">{formattedDate}</p>
                    <p className="text-[8px] font-semibold text-slate-500 mt-0.5 select-all">
                      📞 {paymentSettings?.footerWhatsapp || "01625467988"}
                    </p>
                  </div>
                </div>

                {/* 2. Bill-To + Shipment info Grid */}
                <div className="grid grid-cols-12 gap-1 text-[11px] mb-2 pb-2 border-b border-dashed border-slate-200 relative z-10">
                  
                  {/* Bill to block */}
                  <div className="col-span-7 space-y-1">
                    <span className="text-slate-450 font-extrabold uppercase text-[7.5px] block tracking-wide">Customer Detail / ক্রেতার বিবরণ:</span>
                    <p className="font-black text-slate-950 text-[13px] leading-tight select-all">{customerName || "No Name"}</p>
                    <p className="text-slate-950 font-mono font-bold text-[12px] bg-slate-100 px-1.5 py-0.5 rounded inline-block select-all mt-0.5">
                      📞 {customerPhone || "No Phone"}
                    </p>
                    <p className="text-slate-800 leading-snug text-[9.5px] font-bold pr-2 mt-1 max-h-[50px] overflow-hidden select-all">
                      📍 {customerAddress || "No Address Provided"}
                    </p>
                  </div>

                  {/* Delivery stats block */}
                  <div className="col-span-5 text-right space-y-1 border-l border-slate-100 pl-2 flex flex-col justify-between items-end">
                    <div>
                      <span className="text-slate-455 font-extrabold uppercase text-[7.5px] block tracking-wide">Order reference:</span>
                      <span className="font-mono text-[11.5px] text-emerald-950 font-black bg-emerald-50 border border-emerald-150 rounded px-1.5 py-0.2 inline-block select-all">
                        #{getOrderNumber(order)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 font-extrabold uppercase text-[7.5px] block tracking-wide">Payment Method:</span>
                      <span className="font-extrabold text-slate-800 uppercase bg-slate-100 px-1.5 py-0.2 rounded font-mono text-[9px] select-all">{order.paymentMethod || "COD"}</span>
                    </div>
                  </div>

                </div>

                {/* 3. Dispatch Directive Block (A5 saving focal highlight) */}
                {order.paymentMethod?.toLowerCase() !== "cod" ? (
                  <div className="bg-emerald-50 border border-emerald-305 rounded-xl p-2.5 mb-2.5 text-center relative z-10">
                    <span className="text-[7.5px] font-black text-emerald-850 uppercase tracking-widest block">Dispatch Directive / লাইভ স্ট্যাটাস</span>
                    <p className="text-[11.5px] font-black text-emerald-800 leading-none mt-0.5">PREPAID IN FULL (বিকাশ/নগদ পেইড)</p>
                    <div className="bg-emerald-600 text-white font-extrabold rounded py-0.5 px-3 mt-1.5 text-[9.5px] max-w-[280px] mx-auto uppercase tracking-wide">
                      DO NOT COLLECT CASH / ক্যাশ আদায় করবেন না
                    </div>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-300 rounded-xl p-2.5 mb-2.5 text-center relative z-10">
                    <span className="text-[7.5px] font-black text-rose-850 uppercase tracking-widest block">Dispatch Directive / পেমেন্ট ডিরেক্টিভ</span>
                    <p className="text-[11px] font-bold text-rose-700 leading-none mt-0.5">CASH ON DELIVERY (ক্যাশ অন ডেলিভারি)</p>
                    <div className="bg-rose-600 text-white font-black rounded py-1 px-4 mt-1.5 text-[12.5px] max-w-[280px] mx-auto uppercase tracking-wide shadow-xs font-mono">
                      Collect: ৳{totals.grandTotal.toLocaleString()} BDT
                    </div>
                  </div>
                )}

                {/* 5. Item list Table */}
                <table className="w-full text-left text-[11px] mb-2 relative z-10">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[8px] tracking-wider font-extrabold">
                      <th className="p-1.5 px-2.5 rounded-l">Product Description / পন্যের বিবরণ</th>
                      <th className="p-1.5 text-center w-16">Size</th>
                      <th className="p-1.5 text-center w-12">Qty</th>
                      <th className="p-1.5 text-right pr-2.5 rounded-r w-20">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-2 px-2.5 text-slate-800 text-[10.5px]">
                        <div className="font-bold select-all">{order.productName || "E-Commerce Product"}</div>
                      </td>
                      <td className="p-2 text-center text-blue-700 font-extrabold text-[10.5px] uppercase select-all">
                        {order.size || order.selectedSize || "—"}
                      </td>
                      <td className="p-2 text-center text-slate-600 font-mono font-medium">1</td>
                      <td className="p-2 text-right pr-2.5 font-bold font-mono text-slate-800 text-[10.5px] select-all">
                        ৳{totals.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Invoice Footer Breakdown */}
              <div className="space-y-3.5 relative z-10">
                
                {/* Visual barcode or scan details block */}
                <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                  
                  {/* Customer Service Gateway QR */}
                  <div className="flex items-center gap-2">
                    <img
                      id="invQRCode"
                      src={qrCodeUrl}
                      alt="Invoice QR"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 object-contain rounded border border-slate-150 p-0.5 bg-white mix-blend-multiply"
                    />
                    <div>
                      <span className="text-[7.5px] font-black text-slate-450 uppercase tracking-widest block">Customer Copy</span>
                      <p className="text-[7.5px] text-slate-400 font-semibold leading-tight max-w-[120px]">
                        স্ক্যান করে ওয়েবসাইটের রিয়েল-টাইম ডেলিভারি আপডেট দেখতে পারেন।
                      </p>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="w-52 text-[10.5px] space-y-1 font-bold text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-450 text-[9px] uppercase">Subtotal / পণ্য মূল্য:</span>
                      <span className="font-mono font-bold text-slate-900 text-[10.5px]">৳{totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-450 text-[9px] uppercase">Delivery / ডেলিভারি ফি:</span>
                      <span className="font-mono font-bold text-slate-900 text-[10.5px]">৳{totals.delivery.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-black text-xs text-slate-955 border-t border-slate-250 pt-1.5 bg-slate-50 px-2 py-1 rounded inline-flex w-full">
                      <span className="mr-auto text-slate-955 font-bold text-[9px] uppercase">Total Payable / সর্বমোট:</span>
                      <span className="text-slate-955 font-mono font-extrabold text-[12px]">৳{totals.grandTotal.toLocaleString()} BDT</span>
                    </div>
                  </div>

                </div>

                {/* 7. Signature Pad Section (Required on premium cash memos) */}
                <div className="grid grid-cols-2 gap-8 pt-1 text-[9px] text-slate-400 font-sans">
                  <div className="text-center">
                    <div className="border-b border-dashed border-slate-300 w-28 mx-auto h-3"></div>
                    <p className="font-extrabold text-slate-500 mt-1 uppercase text-[7.5px] tracking-wider">Customer Signature / ক্রেতার স্বাক্ষর</p>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-dashed border-slate-300 w-28 mx-auto h-3"></div>
                    <p className="font-extrabold text-slate-500 mt-1 uppercase text-[7.5px] tracking-wider">Authorized signature / কর্তৃপক্ষের স্বাক্ষর</p>
                  </div>
                </div>

                {/* Corporate Memo Footer signature line */}
                <div className="border-t border-slate-100 pt-2 text-[8px] text-slate-400 text-center font-bold tracking-wider uppercase">
                  ✨ {paymentSettings?.footerTagline || "Digital Lifestyle Companion"} ✨
                </div>

              </div>
            </div>

            {/* Simulated cutting guide on screen only */}
            <div className="no-print mt-3 flex items-center gap-1.5 text-slate-400 text-[10px] font-bold tracking-wider select-none uppercase">
              <span>✂️</span>
              <span>A5 Size Memo Printing Border</span>
              <span>--------------------------------</span>
            </div>

          </div>

        </div>

        {/* Modal Action Controls footer */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap justify-end gap-2.5 no-print">
          <button
            onClick={onClose}
            className="border border-slate-200 text-slate-650 font-bold text-xs py-2 px-4 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2 px-5.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice Memo</span>
          </button>

          {order.status === "Pending" ? (
            <button
              onClick={() => handleToggleStatus("Delivered")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Mark as Delivered</span>
            </button>
          ) : (
            <button
              onClick={() => handleToggleStatus("Pending")}
              className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold text-xs py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-1"
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
