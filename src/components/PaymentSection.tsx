import React, { useState, useEffect } from "react";
import { CreditCard, Save, Truck, Landmark, User, FileText, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { PaymentSettings } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreError";

interface PaymentSectionProps {
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ addToast }) => {
  const [bkash, setBkash] = useState("");
  const [nagad, setNagad] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [deliveryInside, setDeliveryInside] = useState("");
  const [deliveryOutside, setDeliveryOutside] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Realtime Listener for payment settings doc
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as PaymentSettings;
          setBkash(data.bkash || "");
          setNagad(data.nagad || "");
          setBankName(data.bankName || "");
          setBankAccountName(data.bankAccountName || "");
          setBankAccountNumber(data.bankAccountNumber || "");
          setBankBranch(data.bankBranch || "");
          setDeliveryInside(data.deliveryInside !== undefined ? String(data.deliveryInside) : "");
          setDeliveryOutside(data.deliveryOutside !== undefined ? String(data.deliveryOutside) : "");
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/payment");
        addToast("error", "Failed to fetch merchant listings from server.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [addToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      await setDoc(doc(db, "settings", "payment"), {
        bkash: bkash.trim(),
        nagad: nagad.trim(),
        bank: bankAccountNumber.trim(), // Keep fallback bank field
        bankName: bankName.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankBranch: bankBranch.trim(),
        deliveryInside: deliveryInside === "" ? 0 : Number(deliveryInside),
        deliveryOutside: deliveryOutside === "" ? 0 : Number(deliveryOutside),
      }, { merge: true });
      addToast("success", "Merchant payment credentials and delivery charges updated securely! 💳");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/payment");
      addToast("error", "Could not update credentials. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs font-semibold text-slate-500">Syncing Gateway Config...</p>
      </div>
    );
  }

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

  const handleDeliveryInsideChange = (val: string) => {
    setDeliveryInside(keepAndConvertEnglishDigits(val));
  };

  const handleDeliveryOutsideChange = (val: string) => {
    setDeliveryOutside(keepAndConvertEnglishDigits(val));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-6 no-print"
    >
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">Payment Gateway Configuration</h2>
          <p className="text-[11px] text-slate-400">Configure public merchant numbers shown on user invoice receipts</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Mobile Banking Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase">bKash Personal Account Number</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#e11d48] text-white flex items-center justify-center font-bold text-[9px] rounded-full">b</span>
              <input
                type="text"
                value={bkash}
                onChange={(e) => setBkash(e.target.value)}
                placeholder="Ex. 017XXXXXXXX (bKash Number)"
                className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-11 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">Public bKash wallet details</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase">Nagad Personal Account Number</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#ea580c] text-white flex items-center justify-center font-bold text-[9px] rounded-full">n</span>
              <input
                type="text"
                value={nagad}
                onChange={(e) => setNagad(e.target.value)}
                placeholder="Ex. 019XXXXXXXX (Nagad Number)"
                className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-11 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-400">Public Nagad wallet details</p>
          </div>
        </div>

        {/* Bank Transfer Configuration Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider font-sans">Bank Transfer (ব্যাংক ট্রান্সফার সেটিংস)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Bank Name (ব্যাংক নাম)</label>
              <div className="relative font-sans">
                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex. IFIC BANK"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition uppercase"
                />
              </div>
              <p className="text-[10px] text-slate-400">Name of the bank</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Account Name (হোল্ডার নাম)</label>
              <div className="relative font-sans">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="Ex. MD KAZI SAGOR"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition uppercase"
                />
              </div>
              <p className="text-[10px] text-slate-400">Bank account holder's name</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Account Number (একাউন্ট নম্বর)</label>
              <div className="relative font-sans">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Ex. 0200109752811"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">Unique bank account number</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Branch Name (শাখা)</label>
              <div className="relative font-sans">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="Ex. Genda, Upshakha"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition"
                />
              </div>
              <p className="text-[10px] text-slate-400">Bank branch location / name</p>
            </div>
          </div>
        </div>

        {/* Delivery Fees Configuration Section */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider font-sans">Delivery Charges (ডেলিভারি চার্জ)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Delivery Charge Inside Dhaka (BDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  value={deliveryInside}
                  onChange={(e) => handleDeliveryInsideChange(e.target.value)}
                  placeholder="Ex. 60"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">Dynamic fee applied for addresses inside Dhaka</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase">Delivery Charge Outside Dhaka (BDT)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*\.?[0-9]*"
                  value={deliveryOutside}
                  onChange={(e) => handleDeliveryOutsideChange(e.target.value)}
                  placeholder="Ex. 120"
                  className="w-full border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl pl-8 pr-3.5 py-2.5 text-sm outline-none transition font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400">Dynamic fee applied for addresses outside Dhaka</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3 rounded-xl text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer ${
            saving 
              ? "bg-slate-400 cursor-not-allowed" 
              : "bg-blue-600 hover:bg-blue-700 active:scale-98"
          }`}
        >
          {saving ? (
            <>Saving Settings...</>
          ) : (
            <>
              <Save className="w-4 h-4 shrink-0" />
              Update Payment Options
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
