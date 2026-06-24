import React, { useState, useEffect } from "react";
import { ShieldCheck, Save, Globe, Phone, Mail, Facebook, MapPin, Sparkles, User, Info, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { PaymentSettings } from "../types";
import { handleFirestoreError, OperationType } from "../firestoreError";

interface FooterSettingsSectionProps {
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export const FooterSettingsSection: React.FC<FooterSettingsSectionProps> = ({ addToast }) => {
  const [developerName, setDeveloperName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [facebook, setFacebook] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Default Fallbacks defined by user guidelines
  const DEFAULT_DEV_NAME = "MD KAZI SAGOR";
  const DEFAULT_WHATSAPP = "01625467988";
  const DEFAULT_EMAIL = "kazicom03@gmail.com";
  const DEFAULT_FACEBOOK = "https://www.facebook.com/md.sagor.795247";
  const DEFAULT_ADDRESS = "B-2/2, Anandapur, Genda, Savar, Dhaka";
  const DEFAULT_TAGLINE = "Digital Lifestyle Companion";

  useEffect(() => {
    // Real-time listener for settings/payment document
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as PaymentSettings;
          setDeveloperName(data.footerDeveloperName || "");
          setWhatsapp(data.footerWhatsapp || "");
          setEmail(data.footerEmail || "");
          setFacebook(data.footerFacebook || "");
          setAddress(data.footerOfficeAddress || "");
          setTagline(data.footerTagline || "");
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "settings/payment");
        addToast("error", "ফায়্যারস্টোর থেকে সেটিংস লোড করতে ব্যর্থ হয়েছে।");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [addToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      await setDoc(
        doc(db, "settings", "payment"),
        {
          footerDeveloperName: developerName.trim(),
          footerWhatsapp: whatsapp.trim(),
          footerEmail: email.trim(),
          footerFacebook: facebook.trim(),
          footerOfficeAddress: address.trim(),
          footerTagline: tagline.trim(),
        },
        { merge: true }
      );
      addToast("success", "ফুটার ও ব্র্যান্ড সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে! 🚀");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/payment");
      addToast("error", "সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <svg className="animate-spin h-8 w-8 text-emerald-500 mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs font-semibold text-slate-500">ব্র্যান্ড সেটিংস সিঙ্ক হচ্ছে...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-xs p-6 no-print"
    >
      {/* Header Panel */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-xs">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Footer & Brand Settings (ফুটার ও ব্র্যান্ড সেটিংস)</h2>
          <p className="text-[11px] text-slate-400">আপনার মূল ওয়েবসাইটের ফুটারের কাস্টম ব্র্যান্ডিং, কন্টাক্ট ইনফো এবং সোশ্যাল লিঙ্ক পরিবর্তন করুন</p>
        </div>
      </div>

      {/* Info Notice Box */}
      <div className="mb-6 p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">💡 অ্যাডমিনের জন্য ব্যবহারের নির্দেশনা (Admin Advisory):</p>
          <p className="leading-relaxed text-amber-700">
            ওপরে বা নিচে উল্লেখিত কোনো তথ্য ইনপুট দেওয়ার ঘর ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে ওয়েবসাইটের ডিফল্ট ভ্যালুগুলো সর্বজনীনভাবে প্রদর্শিত হবে। এর ফলে ওয়েবসাইট কোনোদিন ভেঙে যাবে না কিংবা কোনো জায়গা খালি দেখাবে না। নতুন ডেটা ইনপুট দিয়ে নিচ থেকে <span className="font-bold">"সেটিংস সংরক্ষণ করুন"</span> বাটনে ক্লিক করলেই সাথে সাথে পুরো ওয়েবসাইটে রিয়েল-টাইমে পরিবর্তনগুলো দৃশ্যমান হয়ে যাবে!
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Designer and Contact Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Designer / Developer Name */}
          <div className="space-y-1.5 animate-fade-in">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Designer & Developer Name / প্রস্তুতকারকের নাম
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={developerName}
                onChange={(e) => setDeveloperName(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_DEV_NAME}`}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-sans text-slate-700 font-semibold"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে দেখাবে: <span className="font-bold text-slate-600 select-all">{DEFAULT_DEV_NAME}</span>
            </p>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              WhatsApp Support No / ওয়াটসঅ্যাপ নম্বর
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_WHATSAPP}`}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition font-mono font-bold text-slate-700"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              ১২ সংখ্যার ইন্টারন্যাশনাল ফরম্যাট বা স্ট্যান্ডার্ড নম্বর, ডিফল্ট: <span className="font-bold text-slate-600 select-all">{DEFAULT_WHATSAPP}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Contact Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Contact Email Address / যোগাযোগের ইমেইল
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_EMAIL}`}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition text-slate-700 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              গ্রাহকদের সাপোর্টের জন্য যেকোনো ইমেল, ডিফল্ট: <span className="font-bold text-slate-600 select-all">{DEFAULT_EMAIL}</span>
            </p>
          </div>

          {/* Facebook Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Facebook URL Profile Link / ফেসবুক প্রোফাইল
            </label>
            <div className="relative">
              <Facebook className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_FACEBOOK}`}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition text-blue-600 font-medium scale-100"
              />
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-full">
              পেজ, গ্রুপ বা আইডি লিঙ্ক সরাসরি দিন, ডিফল্ট: <span className="font-bold text-slate-600 block truncate select-all">{DEFAULT_FACEBOOK}</span>
            </p>
          </div>
        </div>

        {/* Tagline & Address */}
        <div className="grid grid-cols-1 gap-5">
          {/* Tagline */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Lifestyle Tagline / স্লোগান
            </label>
            <div className="relative">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_TAGLINE}`}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition text-slate-700 italic font-semibold"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              কপিরাইটের পাশে ফুটার ট্যাগলাইন, ডিফল্ট: <span className="font-bold text-slate-600 select-all">"{DEFAULT_TAGLINE}"</span>
            </p>
          </div>

          {/* Head Office Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              Head Office Address / প্রধান কার্যালয়ের ঠিকানা
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={`ডিফল্ট: ${DEFAULT_ADDRESS}`}
                rows={3}
                className="w-full border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none transition text-slate-700 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              মাল্টি-লাইন হেড অফিস ঠিকানা, ডিফল্ট: <span className="font-bold text-slate-600 select-all">{DEFAULT_ADDRESS}</span>
            </p>
          </div>
        </div>

        {/* Form Action Submit Button */}
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            saving
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/10 active:scale-98"
          }`}
        >
          {saving ? (
            <>ব্র্যান্ড সেটিংস সংরক্ষণ হচ্ছে...</>
          ) : (
            <>
              <Save className="w-4.5 h-4.5 shrink-0" />
              সেটিংস সংরক্ষণ করুন (Save Settings)
            </>
          )}
        </button>
      </form>

      {/* Live Preview section */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          <span>Live Digital Footer Preview (লাইভ ফুটার প্রিভিউ):</span>
        </h3>
        
        <div className="bg-[#0f172a] text-slate-400 p-6 rounded-xl border border-slate-800 space-y-4 shadow-inner text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-slate-500 font-extrabold tracking-wider text-[9px] uppercase block mb-1">Office / কার্যালয়</span>
              <p className="text-slate-300 whitespace-pre-wrap">{address.trim() || DEFAULT_ADDRESS}</p>
            </div>
            <div>
              <span className="text-slate-500 font-extrabold tracking-wider text-[9px] uppercase block mb-1">Contact / যোগাযোগ</span>
              <p className="text-slate-300 font-mono">WhatsApp: {whatsapp.trim() || DEFAULT_WHATSAPP}</p>
              <p className="text-slate-300 font-sans mt-0.5">Email: {email.trim() || DEFAULT_EMAIL}</p>
            </div>
            <div>
              <span className="text-slate-500 font-extrabold tracking-wider text-[9px] uppercase block mb-1">Social Feed / সামাজিক মাধ্যম</span>
              <a
                href={facebook.trim() || DEFAULT_FACEBOOK}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-block truncate max-w-full font-mono text-[10px]"
              >
                {facebook.trim() || DEFAULT_FACEBOOK}
              </a>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 gap-1.5 pt-1">
            <div>
              <span>© {new Date().getFullYear()} SmartHaatBD. Developed by </span>
              <span className="text-[#38bdf8] font-bold font-sans">{developerName.trim() || DEFAULT_DEV_NAME}</span>
            </div>
            <div className="text-slate-500 font-semibold italic flex items-center gap-1">
              <span>🚀 {tagline.trim() || DEFAULT_TAGLINE}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
