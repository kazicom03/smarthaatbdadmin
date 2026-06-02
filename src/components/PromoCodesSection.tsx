import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, setDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError, OperationType } from "../firestoreError";
import { PromoCode } from "../types";
import { Plus, Ticket, Trash2, Calendar, ToggleLeft, ToggleRight, DollarSign, Percent, AlertCircle, Sparkles, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PromoCodesSectionProps {
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export function PromoCodesSection({ addToast }: PromoCodesSectionProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [code, setCode] = useState("");
  const [type, setType] = useState<"flat" | "percentage">("flat");
  const [value, setValue] = useState<number>(0);
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [promoCodeToDelete, setPromoCodeToDelete] = useState<PromoCode | null>(null);

  // Firestore Snapshot for Real-time coupons listing
  useEffect(() => {
    const q = query(collection(db, "promo_codes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PromoCode[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            code: data.code || "",
            type: data.type || "flat",
            value: Number(data.value) || 0,
            minPurchase: Number(data.minPurchase) || 0,
            expiryDate: data.expiryDate || "",
            active: data.active !== false,
            createdAt: Number(data.createdAt) || Date.now(),
          });
        });
        setPromoCodes(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "promo_codes");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Handle Create Promo Code
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const formattedCode = code.trim().toUpperCase();
    if (!formattedCode) {
      addToast("error", "Promo code must have a name!");
      return;
    }
    if (value <= 0) {
      addToast("error", "Value must be greater than zero!");
      return;
    }
    if (type === "percentage" && value > 100) {
      addToast("error", "Percentage cannot exceed 100%!");
      return;
    }
    if (!expiryDate) {
      addToast("error", "Expiry date is required!");
      return;
    }

    // Check duplication
    const duplicate = promoCodes.find((p) => p.code === formattedCode);
    if (duplicate) {
      addToast("error", `Promo code: "${formattedCode}" already exists in the database!`);
      return;
    }

    try {
      const docId = formattedCode.toLowerCase();
      const newPromo: Omit<PromoCode, "id"> = {
        code: formattedCode,
        type,
        value,
        minPurchase: Number(minPurchase) || 0,
        expiryDate,
        active: true,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "promo_codes", docId), newPromo);
      addToast("success", `Promo code "${formattedCode}" created successfully!`);
      
      // Reset Form fields
      setCode("");
      setValue(0);
      setMinPurchase(0);
      setExpiryDate("");
      setShowAddForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `promo_codes/${formattedCode.toLowerCase()}`);
      addToast("error", "Could not save promo code to database.");
    }
  };

  // Toggle active / discount applicability
  const toggleActiveStatus = async (item: PromoCode) => {
    try {
      await updateDoc(doc(db, "promo_codes", item.id), {
        active: !item.active,
      });
      addToast(
        "info",
        `Promo code ${!item.active ? "activated" : "deactivated"} successfully!`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promo_codes/${item.id}`);
      addToast("error", "Failed to update status. Please try again.");
    }
  };

  // Delete Promo Code Execution
  const handleDeleteConfirm = async () => {
    if (!promoCodeToDelete) return;
    try {
      await deleteDoc(doc(db, "promo_codes", promoCodeToDelete.id));
      addToast("success", `Promo code "${promoCodeToDelete.code}" successfully removed!`);
      setPromoCodeToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `promo_codes/${promoCodeToDelete.id}`);
      addToast("error", "Could not delete promo code. Please try again.");
    }
  };

  return (
    <div className="space-y-6" id="promocodes-section-root">
      
      {/* 1. Header Display Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
              <Ticket className="w-5 h-5" />
            </span>
            <span>Promo Code Center</span>
          </h2>
          <p className="text-xs text-emerald-200/70 mt-1 max-w-xl">
            Generate active discount coupons or promo codes to give special deals to your customers. Configure eligibility thresholds and adjust active status in real-time.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Add Promo Code"}</span>
        </button>
      </div>

      {/* 2. Promo Code Creating View Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs"
        >
          <form onSubmit={handleSubmitCode} className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Generate New Discount Coupon</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Promo Code Name */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Promo Code *</label>
                <input
                  type="text"
                  placeholder="e.g. EID50, SAVE20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs font-bold uppercase border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                  required
                />
              </div>

              {/* Discount Type */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Discount Type *</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType("flat")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                      type === "flat"
                        ? "bg-white text-emerald-700 shadow-xs border border-emerald-50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Flat Discount (৳)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("percentage")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-lg transition duration-200 ${
                      type === "percentage"
                        ? "bg-white text-emerald-700 shadow-xs border border-emerald-50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Percentage Discount (%)</span>
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">
                  Discount Value ({type === "flat" ? "৳ BDT" : "% Percent"}) *
                </label>
                <input
                  type="number"
                  placeholder={type === "flat" ? "e.g. 100 BDT" : "e.g. 10%"}
                  value={value || ""}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                  min="1"
                  required
                />
              </div>

              {/* Minimum Purchase */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Min Purchase Limit</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={minPurchase || ""}
                  onChange={(e) => setMinPurchase(Number(e.target.value))}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                  min="0"
                />
              </div>

              {/* Expiry Date */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Expiry Date *</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl p-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                  required
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Promo Code</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* 3. Promo Codes Coupon Matrix */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-400 font-bold">Querying promo codes...</p>
        </div>
      ) : promoCodes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-2xs">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-800">No promo codes found!</p>
          <p className="text-xs text-slate-400 mt-1">
            Click the "Add Promo Code" button to create your first coupon or discount voucher.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {promoCodes.map((item) => {
              const hasExpired = new Date(item.expiryDate).getTime() < new Date().setHours(0,0,0,0);
              
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`bg-white border-2 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between relative ${
                    item.active && !hasExpired
                      ? "border-emerald-100"
                      : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  {/* Decorative dashed inner coupon separator circles */}
                  <span className="absolute top-1/2 -left-3 w-4 h-6 bg-[#f8fafc] rounded-r-full border border-slate-200 border-l-transparent z-10" />
                  <span className="absolute top-1/2 -right-3 w-4 h-6 bg-[#f8fafc] rounded-l-full border border-slate-200 border-r-transparent z-10" />
                  
                  {/* Top Header Card */}
                  <div className={`p-4 ${item.active && !hasExpired ? "bg-emerald-50/20" : "bg-slate-150/30"}`}>
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-black text-slate-900 font-mono tracking-widest text-sm bg-slate-100 px-3 py-1 border border-slate-200 rounded-xl select-all select-none">
                        🎟️ {item.code}
                      </span>
                      
                      {/* Active Status Badge */}
                      <span className={`text-[10px] font-black uppercase rounded-lg px-2 py-0.5 select-none ${
                        hasExpired
                          ? "bg-rose-100 text-rose-800"
                          : item.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {hasExpired ? "Expired" : item.active ? "Active" : "Disabled"}
                      </span>
                    </div>

                    {/* Discount Value Presentation */}
                    <div className="mt-4">
                      <p className="text-xl font-black text-slate-900">
                        {item.type === "flat" ? `৳ ${item.value}` : `${item.value}%`}{" "}
                        <span className="text-xs text-slate-500 font-bold uppercase">Discount</span>
                      </p>
                      
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">
                        Min Purchase:{" "}
                        <span className="text-slate-800 font-extrabold">
                          {item.minPurchase > 0 ? `৳${item.minPurchase} BDT` : "Any Amount"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Coupon Details & Controls */}
                  <div className="p-4 pt-3 border-t border-dashed border-slate-200 space-y-3.5 bg-white">
                    {/* Date Expiry Details */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold select-none">
                      <Calendar className="w-3.5 h-3.5 text-slate-404 shrink-0" />
                      <span>Expiry:</span>
                      <span className={`font-mono font-bold ${hasExpired ? "text-rose-600" : "text-slate-700"}`}>
                        {item.expiryDate}
                      </span>
                    </div>

                    {/* Interactive toggles and actions */}
                    <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-50 select-none">
                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleActiveStatus(item)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer transition select-none"
                        disabled={hasExpired}
                      >
                        {item.active ? (
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                        <span>{item.active ? "Pause" : "Start"}</span>
                      </button>

                      {/* Delete coupon button */}
                      <button
                        type="button"
                        onClick={() => setPromoCodeToDelete(item)}
                        className="p-1.5 text-slate-404 hover:text-rose-600 hover:bg-rose-50 border border-slate-250/20 hover:border-rose-100 rounded-lg transition cursor-pointer select-none"
                        title="Delete coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 4. Promo Code Delete Confirmation Modal */}
      <AnimatePresence>
        {promoCodeToDelete && (
          <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-sm mx-auto"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3 mb-4">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black text-rose-950 uppercase">Delete Promo Code Confirmation</h3>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you sure you want to permanently delete this promo code? Once deleted, customers can no longer use this coupon.
              </p>
              
              <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-3.5 text-[11px] text-slate-700 font-bold space-y-1.5 select-all">
                <p>🎟️ Promo Code: <span className="text-slate-900 font-black tracking-widest">{promoCodeToDelete.code}</span></p>
                <p>💰 Value: <span className="text-slate-900 font-extrabold">{promoCodeToDelete.type === "flat" ? `৳ ${promoCodeToDelete.value}` : `${promoCodeToDelete.value}%`}</span></p>
                <p>📅 Expiry: <span className="text-slate-900 font-extrabold">{promoCodeToDelete.expiryDate}</span></p>
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setPromoCodeToDelete(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
