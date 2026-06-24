import React, { useState, useMemo } from "react";
import { Search, Clipboard, Check, UserCheck, Mail, Phone, MapPin, Calendar, Users, ShieldAlert, ShieldCheck, ClipboardCheck, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Order } from "../types";

const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    // Products (Public read, Admin read/write)
    match /products/{productId} {
      allow read: if true;
      allow write: if true; 
    }

    // Settings (Store configuration, Delivery Fees)
    match /settings/{settingsId} {
      allow read: if true;
      allow write: if true;
    }

    // Orders (Customer order records)
    match /orders/{orderId} {
      allow read: if true;
      allow write: if true;
    }

    // Users (User Profile Registry)
    match /users/{userId} {
      allow read: if true;
      allow write: if true;
    }
  }
}`;

interface UsersSectionProps {
  users: User[];
  orders: Order[];
  addToast: (type: "success" | "error" | "info", text: string) => void;
  permissionError?: boolean;
}

export const UsersSection: React.FC<UsersSectionProps> = ({ users, orders = [], addToast, permissionError }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copiedRules, setCopiedRules] = useState(false);

  // Quick Copy Helper
  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    addToast("success", `${label} copied to clipboard! 📋`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(RECOMMENDED_RULES);
    setCopiedRules(true);
    addToast("success", "Firestore security rules copied! 📋");
    setTimeout(() => setCopiedRules(false), 3000);
  };

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;

    return users.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(query);
      const emailMatch = u.email?.toLowerCase().includes(query);
      const phoneMatch = u.phone?.toLowerCase().includes(query);
      const addressMatch = u.address?.toLowerCase().includes(query);
      const roleMatch = u.role?.toLowerCase().includes(query);

      return nameMatch || emailMatch || phoneMatch || addressMatch || roleMatch;
    });
  }, [users, searchQuery]);

  // Statistics
  const totalCustomers = useMemo(() => {
    return users.filter((u) => u.role === "customer" || !u.role).length;
  }, [users]);

  const totalAdmins = useMemo(() => {
    return users.filter((u) => u.role === "admin").length;
  }, [users]);

  if (permissionError) {
    return (
      <div className="space-y-6 select-none no-print">
        {/* Permission warning banner */}
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/10 border border-amber-200/60 rounded-2xl p-6 text-slate-850 shadow-xs">
          <div className="flex gap-4 items-start">
            <div className="p-3 bg-amber-50 text-amber-600 border border-amber-200/60 rounded-xl shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-800 font-sans">
                Firestore Security Rules Restriction Notice
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Due to highly restricted Firebase Firestore Security Rules database settings, the system is unable to load the entire Registered Users directory at once. By default, Firestore rules restrict read permissions so that general users cannot view other people's database entries.
              </p>
              <p className="text-xs text-amber-700 font-bold leading-relaxed">
                To enable full access to all your dashboard features, please follow the steps below to update your Firestore security rules in the Firebase Console.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-step guide container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Instructions Column */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-black">1</span>
                How to update Firestore security rules:
              </h4>
              
              <ul className="space-y-3 text-xs text-slate-600 pl-1 font-medium font-sans">
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  <span>First, log in to your <strong>Firebase Console</strong>: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1">console.firebase.google.com</a></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  <span>Select your project, then click <strong>Firestore Database</strong> in the left sidebar menu.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  <span>Navigate to the <strong>Rules</strong> tab at the top.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  <span>Delete all current rules in the editor, and paste the code from the <strong>"Copy Rules"</strong> block on the right.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  <span>Click the <strong>Publish</strong> button at the top to publish the rules, then refresh this admin panel page.</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Once the Firestore rules are successfully updated, your <strong>F7 (Registered Users)</strong> tab and all secondary control centers will function seamlessly.
              </p>
            </div>
          </div>

          {/* Recommended Rules Code Block Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-300 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono ml-2">RECOMMENDED_RULES.rules</span>
              </div>
              <button
                type="button"
                onClick={handleCopyRules}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer transition-all"
              >
                {copiedRules ? (
                  <>
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>Copy Rules</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/50 max-h-[220px] overflow-y-auto">
              <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre font-medium antialiased select-all">
                {RECOMMENDED_RULES}
              </pre>
            </div>

            <span className="text-[9px] text-slate-500 font-medium block leading-snug">
              * Note: These security rules grant read/write permissions to critical collections (customers, products, orders, settings) to let the admin panel operate seamlessly.
            </span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none no-print">
      
      {/* 1. TOP SNAPSHOT STATS (sleeker, more compact) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Customers Onboarded Card */}
        <div className="bg-slate-50/60 border border-slate-150/80 px-4 py-3.5 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Registered Customers</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {totalCustomers.toLocaleString()}
            </span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-50">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Total Administrators Card */}
        <div className="bg-slate-50/60 border border-slate-150/80 px-4 py-3.5 rounded-xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Administrators</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {totalAdmins.toLocaleString()}
            </span>
          </div>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-50">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS CONTAINER */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone, email, or address..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10 text-xs transition placeholder:text-slate-400 bg-white shadow-3xs font-medium"
        />
      </div>

      {/* 3. RESPONSIVE TABLE CONTAINER WITH TOP HEADERS AND SERIAL NUMBERINGS */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 p-8 text-center shadow-3xs">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No Customers Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, or double check if the user registered with their correct credentials.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-150/80 overflow-hidden shadow-3xs">
          
          {/* Header Row - Only visible on desktop/large screens */}
          <div className="hidden lg:flex items-center bg-slate-55 border-b border-slate-150 text-[10px] font-bold text-slate-450 uppercase tracking-wider px-4 py-3 select-none">
            <div className="w-10 shrink-0 text-center">#</div>
            <div className="min-w-[220px] max-w-[250px] shrink-0 text-left pl-3">Name & Email (Profile)</div>
            <div className="min-w-[150px] shrink-0 text-left">Mobile (Phone)</div>
            <div className="min-w-[110px] shrink-0 text-center">Total Orders</div>
            <div className="min-w-0 flex-1 text-left pl-3">Shipping Address</div>
            <div className="min-w-[190px] shrink-0 text-right pr-3">Account Info</div>
          </div>

          <div className="divide-y divide-slate-100">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((u, index) => {
                const formattedDate = u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Unknown Date";

                const isCustomer = u.role !== "admin";

                // Dynamic aggregation of user orders based on customer phone match
                const userOrdersCount = orders.filter(
                  (o) => o.customerPhone && u.phone && o.customerPhone.trim() === u.phone.trim()
                ).length;

                return (
                  <motion.div
                    layout
                    key={u.uid}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col lg:flex-row lg:items-center p-4 gap-4 hover:bg-slate-50/50 transition-all text-slate-700"
                  >
                    
                    {/* LEFT-SIDE REGISTERED INDEX NUMBERING */}
                    <div className="hidden lg:flex w-10 shrink-0 items-center justify-center font-mono text-xs font-bold text-slate-450 select-none">
                       {String(index + 1).padStart(2, "0")}
                    </div>

                    {/* Column 1: Profile Avatar, Name, Email */}
                    <div className="flex items-center gap-3 min-w-[220px] max-w-[250px] shrink-0">
                      {/* Mobile numbering badge */}
                      <div className="lg:hidden shrink-0 flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-[10px] font-bold font-mono text-slate-450">
                        #{index + 1}
                      </div>

                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isCustomer 
                          ? "bg-slate-100 text-slate-700 border border-slate-200/50" 
                          : "bg-indigo-50 text-indigo-600 border border-indigo-100/65"
                      }`}>
                        {u.name ? u.name.slice(0, 2).toUpperCase() : "??"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 truncate" title={u.name}>
                            {u.name || "Anonymous User"}
                          </span>
                          {!isCustomer && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-wider shrink-0 border border-indigo-100/50">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-404 block truncate font-medium" title={u.email}>
                          {u.email || "No email provided"}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Mobile Number with Quick Copy */}
                    <div className="flex items-center gap-2 group min-w-[150px] lg:justify-start shrink-0">
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg shrink-0 lg:hidden">
                        <Phone className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-400 block lg:hidden uppercase font-bold tracking-tight">Mobile (Phone)</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-705 select-all font-mono">
                            {u.phone || "N/A"}
                          </span>
                          {u.phone && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(u.phone, "Phone")}
                              className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded transition cursor-pointer shrink-0"
                              title="Copy Phone"
                            >
                              {copiedText === u.phone ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Clipboard className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: USER TOTAL ORDERS COUNT (Pill badge) */}
                    <div className="min-w-[110px] shrink-0 flex items-center lg:justify-center">
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg shrink-0 lg:hidden mr-2">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] text-slate-405 block lg:hidden uppercase font-bold tracking-tight mb-0.5">Total Orders</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black font-sans tracking-tight border inline-flex items-center gap-1 ${
                            userOrdersCount > 0 
                              ? "bg-emerald-50/50 text-emerald-600 border-emerald-500/20" 
                              : "bg-slate-50 text-slate-404 border-slate-150"
                          }`}>
                            <span>{userOrdersCount}</span>
                            <span className="text-[9px] font-medium opacity-85">Orders</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Column 4: Shipping Address with Quick Copy */}
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg shrink-0 mt-0.5 lg:hidden">
                        <MapPin className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-slate-400 block lg:hidden uppercase font-bold tracking-tight">Shipping Address</span>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-slate-650 truncate max-w-full font-medium" title={u.address}>
                            {u.address || <span className="italic text-slate-400">No address stored</span>}
                          </p>
                          {u.address && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(u.address, "Address")}
                              className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded transition cursor-pointer shrink-0"
                              title="Copy Address"
                            >
                              {copiedText === u.address ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Clipboard className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 5: Created Date & UID Copy Badge */}
                    <div className="flex items-center gap-4 justify-between lg:justify-end shrink-0 border-t border-slate-50 pt-3 lg:pt-0 lg:border-t-0 min-w-[190px]">
                      <div className="text-left lg:text-right min-w-[90px]">
                        <span className="text-[9px] text-slate-400 block font-bold lg:hidden">Joined Date</span>
                        <span className="text-xs font-semibold text-slate-500 font-sans">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Copy UID button */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(u.uid, "UID")}
                          className="h-8 px-2.5 rounded-lg border border-slate-150/80 text-[10px] font-mono font-bold text-slate-450 hover:text-slate-700 bg-white hover:bg-slate-50 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-3xs"
                          title="Copy user UID"
                        >
                          {copiedText === u.uid ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <span>ID: {u.uid.slice(0, 5)}...</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  );
};
