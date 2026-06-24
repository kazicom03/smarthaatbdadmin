import React, { useState, useMemo } from "react";
import { Search, Clipboard, Check, Filter, CreditCard, ShieldCheck, HelpCircle, Eye, RefreshCw, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";
import { getTrackingNumber, getOrderNumber } from "../utils/tracking";

interface TrackingSectionProps {
  orders: Order[];
  onOpenDetails: (id: string) => void;
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({ orders, onOpenDetails, addToast }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"All" | "bKash" | "Nagad" | "COD">("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Copy Helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    addToast("success", `${label} copied to clipboard! 📋`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Financial Stats
  const trackingStats = useMemo(() => {
    let bkashSum = 0;
    let nagadSum = 0;
    let codSum = 0;

    orders.forEach((o) => {
      const pm = o.paymentMethod?.toLowerCase() || "";
      const totalCost = (o.productPrice || 0) + (Number(o.deliveryCharge) || 0);
      if (pm.includes("bkash")) {
        bkashSum += totalCost;
      } else if (pm.includes("nagad")) {
        nagadSum += totalCost;
      } else {
        codSum += totalCost;
      }
    });

    return { bkashSum, nagadSum, codSum };
  }, [orders]);

  // Filtering list
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Payment filter check
      const pm = o.paymentMethod?.toLowerCase() || "cod";
      let matchPayment = true;
      if (paymentFilter === "bKash") {
        matchPayment = pm.includes("bkash");
      } else if (paymentFilter === "Nagad") {
        matchPayment = pm.includes("nagad");
      } else if (paymentFilter === "COD") {
        matchPayment = pm.includes("cod") || pm === "cash on delivery" || pm === "";
      }

      // Search match
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchPayment;

      const trackingNumberMatch = getTrackingNumber(o).toLowerCase().includes(query);
      const orderIdMatch = o.id?.toLowerCase().includes(query);
      const trxIdMatch = o.transactionId?.toLowerCase().includes(query);
      const nameMatch = o.customerName?.toLowerCase().includes(query);
      const phoneMatch = o.customerPhone?.toLowerCase().includes(query);
      const productMatch = o.productName?.toLowerCase().includes(query);

      return matchPayment && (trackingNumberMatch || orderIdMatch || trxIdMatch || nameMatch || phoneMatch || productMatch);
    });
  }, [orders, searchQuery, paymentFilter]);

  return (
    <div className="space-y-6 select-none no-print">
      
      {/* 1. FINANCIAL SUMMARY WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* bKash Wallet Balance Snapshot */}
        <div className="bg-gradient-to-br from-pink-500/5 to-rose-500/10 border border-pink-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider block">bKash Active Orders</span>
            <span className="text-xl font-black text-slate-900 font-mono">৳{trackingStats.bkashSum.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block">Total received via bKash gateway</span>
          </div>
          <div className="p-3 bg-pink-550/10 text-pink-500 border border-pink-100 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Nagad Wallet Balance Snapshot */}
        <div className="bg-gradient-to-br from-orange-500/5 to-amber-500/10 border border-orange-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Nagad Active Orders</span>
            <span className="text-xl font-black text-slate-900 font-mono">৳{trackingStats.nagadSum.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block">Total processed via Nagad gateway</span>
          </div>
          <div className="p-3 bg-orange-550/10 text-orange-500 border border-orange-100 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* COD Balance Snapshot */}
        <div className="bg-gradient-to-br from-indigo-500/5 to-blue-500/10 border border-indigo-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">COD Total Collection</span>
            <span className="text-xl font-black text-slate-900 font-mono">৳{trackingStats.codSum.toLocaleString()}</span>
            <span className="text-[9px] text-slate-400 block">Collections via Cash On Delivery</span>
          </div>
          <div className="p-3 bg-indigo-550/10 text-indigo-500 border border-indigo-100 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL CONTROLLER */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Dedicated Search bar */}
        <div className="relative w-full md:w-[420px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order No / TrxID / Client Name / Phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10 text-xs transition placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 focus:bg-white font-medium"
          />
        </div>

        {/* Payment filters tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {(["All", "bKash", "Nagad", "COD"] as const).map((method) => {
            const isActive = paymentFilter === method;
            return (
              <button
                key={method}
                onClick={() => setPaymentFilter(method)}
                className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-100"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {method === "All" ? "All Payments" : method}
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. SHARP RESTRUCTURING TABLE/CARD GRID */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 p-8 text-center">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No Matching Ledger records found</h4>
          <p className="text-xs text-slate-405 mt-1 max-w-md mx-auto">
            Review your parameters of search queries or matching checkboxes of payment modes.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-slate-150 rounded-2xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Identity & Tracking</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Listed Item Name</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Transaction ID (TrxID)</th>
                  <th className="py-3 px-4 text-right">Sum Bill</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredOrders.map((o) => {
                  const total = (o.productPrice || 0) + (o.deliveryCharge || 0);
                  const isBkash = o.paymentMethod?.toLowerCase().includes("bkash");
                  const isNagad = o.paymentMethod?.toLowerCase().includes("nagad");
                  const isCod = !isBkash && !isNagad;

                  // Format Date
                  const orderDate = new Date(o.time).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      {/* Tracking Number and Numeric Order ID */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="space-y-1.5 min-w-[200px]">
                          {/* Purely Numeric Order Number */}
                          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-[10px] w-fit">
                            <span className="text-emerald-600 font-extrabold uppercase text-[8px] tracking-wide">Order No:</span>
                            <span className="font-mono font-black text-emerald-950 select-all">{getOrderNumber(o)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(getOrderNumber(o), "Order Number")}
                              className="p-0.5 text-emerald-600 hover:bg-emerald-100 rounded transition cursor-pointer"
                              title="Copy Order ID"
                            >
                              {copiedId === getOrderNumber(o) ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Clipboard className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          
                          {/* Tracking ID with hyphens */}
                          <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50/80 border border-slate-150 rounded px-1.5 py-0.5 text-[10px] w-fit">
                            <span className="text-slate-450 font-extrabold uppercase text-[8px] tracking-wide">Tracking:</span>
                            <span className="font-mono font-bold select-all">{getTrackingNumber(o)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(getTrackingNumber(o), "Tracking Number")}
                              className="p-0.5 text-slate-400 hover:bg-slate-200 rounded transition cursor-pointer"
                              title="Copy Tracking"
                            >
                              {copiedId === getTrackingNumber(o) ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Clipboard className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {orderDate}
                      </td>

                      {/* Customer metadata */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-800 truncate max-w-[140px]">{o.customerName || "Anonymous"}</p>
                          <p className="text-[10px] text-slate-450 font-mono select-all font-semibold">{o.customerPhone || "N/A"}</p>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 max-w-[150px] truncate" title={o.productName}>
                        {o.productName}
                      </td>

                      {/* Payment Method Logo Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isBkash && (
                          <span className="bg-pink-50 border border-pink-100 text-pink-600 font-extrabold text-[10px] px-2 py-0.5 rounded-full select-none">
                            bKash
                          </span>
                        )}
                        {isNagad && (
                          <span className="bg-orange-50 border border-orange-100 text-orange-600 font-extrabold text-[10px] px-2 py-0.5 rounded-full select-none">
                            Nagad
                          </span>
                        )}
                        {isCod && (
                          <span className="bg-slate-100 border border-slate-200 text-slate-650 font-semibold text-[10px] px-2 py-0.5 rounded-full select-none">
                            {o.paymentMethod || "COD"}
                          </span>
                        )}
                      </td>

                      {/* Transaction ID with quick copy */}
                      <td className="py-3.5 px-4">
                        {o.transactionId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-600 text-[10px] bg-indigo-50/50 px-1.5 py-0.5 rounded" title={o.transactionId}>
                              {o.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(o.transactionId || "", "Transaction ID")}
                              className="p-1 hover:bg-indigo-100/50 text-indigo-400 hover:text-indigo-600 rounded transition cursor-pointer"
                              title="Copy TrxID"
                            >
                              {copiedId === o.transactionId ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Clipboard className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">No transaction</span>
                        )}
                      </td>

                      {/* Sum Bill */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                        ৳{total.toLocaleString()}
                      </td>

                      {/* Opened Details/Receipt Modal Launcher */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenDetails(o.id || "")}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg border border-slate-100/50 transition cursor-pointer mx-auto flex items-center justify-center"
                          title="View Receipt"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
