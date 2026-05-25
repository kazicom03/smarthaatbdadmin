import React, { useState, useMemo } from "react";
import { Search, Eye, Filter, Clock, CheckCircle2, AlertCircle, ShoppingBag, MapPin, Phone, MessageSquarePlus, Clipboard, Check, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";
import { getTrackingNumber, getOrderNumber } from "../utils/tracking";

interface OrdersSectionProps {
  orders: Order[];
  onOpenDetails: (id: string) => void;
}

export const OrdersSection: React.FC<OrdersSectionProps> = ({ orders, onOpenDetails }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Delivered">("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtering Logic (Case-Insensitive Database Match)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus =
        statusFilter === "All" ||
        o.status?.toLowerCase() === statusFilter.toLowerCase();
      
      const query = search.toLowerCase();
      const trkNum = getTrackingNumber(o).toLowerCase();
      const matchSearch =
        o.customerName?.toLowerCase().includes(query) ||
        o.customerPhone?.toLowerCase().includes(query) ||
        o.productName?.toLowerCase().includes(query) ||
        o.customerAddress?.toLowerCase().includes(query) ||
        o.id?.toLowerCase().includes(query) ||
        trkNum.includes(query);

      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6 no-print">
      
      {/* Search and Filters Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96 select-none">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, product, or address..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10 text-xs transition placeholder:text-slate-400 bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Status Pills Filter */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto scale-95 md:scale-100">
          {(["All", "Pending", "Delivered"] as const).map((tab) => {
            const isActive = statusFilter === tab;
            let count = 0;
            if (tab === "All") count = orders.length;
            else if (tab === "Pending") count = orders.filter((o) => o.status?.toLowerCase() === "pending").length;
            else if (tab === "Delivered") count = orders.filter((o) => o.status?.toLowerCase() === "delivered").length;

            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>{tab}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isActive 
                    ? "bg-slate-100 text-slate-700" 
                    : "bg-slate-200/60 text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Orders Grid/Table Display */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 text-center py-20 p-8">
          <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-600">No Matching Orders Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-normal">
            We couldn't define any customer receipt containing "{search}" or with the filter "{statusFilter}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((o, idx) => {
              const isPending = o.status?.toLowerCase() === "pending";
              const formattedDate = new Date(o.time).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md rounded-2xl p-5 md:p-6 transition-all duration-200 flex flex-col gap-5 relative overflow-hidden"
                >
                  {/* Accent Status Strip at Left */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                  {/* Header Row: Product Title and Primary Status Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 pl-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight hover:text-emerald-600 transition">
                          {o.productName}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold font-mono flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span>BOOKED ON: {formattedDate}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap select-none">
                      {/* Status Pill */}
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border flex items-center gap-1.5 shadow-2xs ${
                        isPending 
                          ? "bg-amber-50 text-amber-700 border-amber-200/50" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        <span>{isPending ? "Pending" : "Delivered"}</span>
                      </span>

                      {/* Payment Method */}
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border flex items-center gap-1.5 shadow-2xs ${
                        o.paymentMethod?.toLowerCase() !== "cod"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-ping"></span>
                        <span>{o.paymentMethod || "COD"}</span>
                        {o.paymentMethod?.toLowerCase() !== "cod" && (
                          <span className="text-[8px] bg-purple-150 text-purple-800 px-1 rounded-sm ml-1 font-black">
                            MFS Paid
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Grid Content: Customer details, Identifiers, Addresses */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pl-2">
                    
                    {/* Left & Mid section: Customer & System IDs (Span 8) */}
                    <div className="lg:col-span-8 space-y-4">
                      
                      {/* Customer contact stack */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Name Block */}
                        <div className="bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 transition">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-400 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest leading-none mb-1">Customer Name</span>
                            <span className="text-slate-800 font-extrabold text-xs capitalize truncate block">
                              {o.customerName || "No Name Given"}
                            </span>
                          </div>
                        </div>

                        {/* Phone Block */}
                        <div className="bg-slate-50/60 hover:bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3 transition">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-400 shrink-0">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest leading-none mb-1">Mobile Contact</span>
                            <a href={`tel:${o.customerPhone}`} className="text-slate-805 font-sans font-black text-xs hover:text-emerald-600 transition tracking-wider block select-all">
                              {o.customerPhone || "N/A"}
                            </a>
                          </div>
                        </div>

                      </div>

                      {/* Identifiers Row: Dynamic Order ID + Tracking */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        
                        {/* Purely Numeric Order Number */}
                        <div className="flex items-center justify-between gap-3 bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-200/50 rounded-xl px-3 py-1.5 shadow-3xs transition-all w-fit group/order">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest">Order ID</span>
                            <span className="text-emerald-950 font-mono font-black text-xs select-all">
                              {getOrderNumber(o)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(getOrderNumber(o))}
                            className="p-1 hover:bg-emerald-100/60 rounded text-emerald-600 hover:text-emerald-800 transition shrink-0 cursor-pointer"
                            title="Copy Order Number"
                          >
                            {copiedId === getOrderNumber(o) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5 opacity-80 group-hover/order:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>

                        {/* Structured Tracking ID */}
                        <div className="flex items-center justify-between gap-3 bg-slate-100/50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 shadow-3xs transition-all w-fit group/track">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-450 font-extrabold uppercase tracking-widest">Tracking</span>
                            <span className="text-slate-800 font-mono font-bold text-xs select-all">
                              {getTrackingNumber(o)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(getTrackingNumber(o))}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition shrink-0 cursor-pointer"
                            title="Copy Tracking ID"
                          >
                            {copiedId === getTrackingNumber(o) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5 opacity-80 group-hover/track:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>

                      </div>

                      {/* Shipping Address Container (Large Layout banner) */}
                      <div className="flex gap-3 bg-slate-50/55 hover:bg-slate-50 border border-slate-100 p-3.5 rounded-xl transition duration-150">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-widest">Delivering To Address</span>
                          <p className="text-xs text-slate-700 font-semibold select-all leading-normal">
                            {o.customerAddress || "No delivery address supplied."}
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Right side Pricing Ledger & Management (Span 4) */}
                    <div className="lg:col-span-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 md:p-5 flex flex-col justify-between gap-4">
                      
                      {/* Price breakdown block */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-widest mb-1.5 border-b border-slate-200 pb-1.5">Pricing Summary</span>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Product Unit Price:</span>
                          <span className="font-mono font-semibold text-slate-705">৳{(o.productPrice || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-dashed border-slate-200">
                          <span>Delivery Charge:</span>
                          <span className="font-mono font-semibold text-slate-705">+ ৳{(o.deliveryCharge || 0).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 font-mono">
                          <span className="text-xs font-black text-slate-800 uppercase">Total Bill:</span>
                          <span className="text-base font-black text-slate-950 font-sans">
                            ৳{((o.productPrice || 0) + (Number(o.deliveryCharge) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Manage Button */}
                      <button
                        onClick={() => onOpenDetails(o.id)}
                        className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition duration-250 cursor-pointer flex items-center justify-center gap-2 select-none active:scale-98 shadow-sm hover:shadow-md border border-slate-800/10"
                      >
                        <span>Manage Order</span>
                        <Eye className="w-4 h-4 shrink-0" />
                      </button>

                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
};
