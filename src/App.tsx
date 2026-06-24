import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PlusCircle, CreditCard, ClipboardList, ShieldAlert, Wifi, Sliders, Calendar, User, Clock, Loader2, Package, LayoutDashboard, ShieldCheck, Users, LogOut, MessageSquare, Star, Ticket, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { Product, Order, User as UserType, PaymentSettings } from "./types";
import { handleFirestoreError, OperationType } from "./firestoreError";

// Components
import { Toast, ToastMessage } from "./components/Toast";
import { StatsOverview } from "./components/StatsOverview";
import { ProductSection } from "./components/ProductSection";
import { PaymentSection } from "./components/PaymentSection";
import { OrdersSection } from "./components/OrdersSection";
import { ManageProducts } from "./components/ManageProducts";
import { InvoiceModal } from "./components/InvoiceModal";
import { DashboardHome } from "./components/DashboardHome";
import { TrackingSection } from "./components/TrackingSection";
import { UsersSection } from "./components/UsersSection";
import { AdminLogin } from "./components/AdminLogin";
import { CustomerChatWidget } from "./components/CustomerChatWidget";
import { AdminMessages } from "./components/AdminMessages";
import { ReviewsSection } from "./components/ReviewsSection";
import { PromoCodesSection } from "./components/PromoCodesSection";
import { FooterSettingsSection } from "./components/FooterSettingsSection";

export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isAdminLoggedIn") === "true");

  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboardHome" | "productSection" | "paymentSection" | "ordersSection" | "manageProducts" | "trackingSection" | "usersSection" | "messages" | "reviews" | "promoCodes" | "footerSettings">("dashboardHome");
  
  // Global settings state (including branding)
  const [globalSettings, setGlobalSettings] = useState<PaymentSettings | null>(null);

  // Real-time listener for global payment and footer settings
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          setGlobalSettings(docSnap.data() as PaymentSettings);
        }
      },
      (error) => {
        console.error("Failed to sync global settings screenshot: ", error);
      }
    );
    return () => unsub();
  }, []);
  
  // Real-time Database state
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [usersPermissionError, setUsersPermissionError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbState, setDbState] = useState<"connecting" | "connected" | "error">("connecting");
  
  // Modal controllers
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Custom Toast notification states
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Local clock state for professional timing layout
  const [timeStr, setTimeStr] = useState("");

  const addToast = useCallback((type: "success" | "error" | "info", text: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, text }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clock runner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Hotkey listener for F1 - F6 keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering hotkeys when typing in inputs/textareas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.getAttribute("contenteditable") === "true")) {
        return;
      }

      switch (e.key) {
        case "F1":
          e.preventDefault();
          setActiveTab("productSection");
          addToast("info", "Shortcut: Add Product view opened!");
          break;
        case "F2":
          e.preventDefault();
          setActiveTab("manageProducts");
          addToast("info", "Shortcut: Manage active Ads view opened!");
          break;
        case "F3":
          e.preventDefault();
          setActiveTab("paymentSection");
          addToast("info", "Shortcut: Payment Settings view opened!");
          break;
        case "F4":
          e.preventDefault();
          setActiveTab("ordersSection");
          addToast("info", "Shortcut: Customers Order Ledger opened!");
          break;
        case "F5":
          e.preventDefault();
          setActiveTab("dashboardHome");
          addToast("info", "Shortcut: Dashboard Home opened!");
          break;
        case "F6":
          e.preventDefault();
          setActiveTab("trackingSection");
          addToast("info", "Shortcut: Dedicated Payment Tracking Ledger opened!");
          break;
        case "F7":
          e.preventDefault();
          setActiveTab("usersSection");
          addToast("info", "Shortcut: Dedicated Users Directory opened!");
          break;
        case "F8":
          e.preventDefault();
          setActiveTab("messages");
          addToast("info", "Shortcut: Live Customer Chats and Messages tab opened!");
          break;
        case "F9":
          e.preventDefault();
          setActiveTab("reviews");
          addToast("info", "Shortcut: Customers Ratings and Reviews Moderation opened!");
          break;
        case "F10":
          e.preventDefault();
          setActiveTab("promoCodes");
          addToast("info", "Shortcut: Discounts and Promo Codes Ledger opened!");
          break;
        case "F11":
          e.preventDefault();
          setActiveTab("footerSettings");
          addToast("info", "Shortcut: Footer & Brand Settings view opened! 🌐");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addToast]);

  // Firebase Real-time listeners
  useEffect(() => {
    // 1. Snapshot Listener for products
    const qProducts = collection(db, "products");
    const unsubProducts = onSnapshot(
      qProducts,
      (snapshot) => {
        const prodList: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          prodList.push({
            id: doc.id,
            name: data.name || "",
            price: Number(data.price) || 0,
            description: data.description || "",
            image: data.image || "",
            images: data.images || [],
            time: Number(data.time) || Date.now(),
            category: data.category || "Women’s & Girls’ Fashion",
          });
        });
        // Sort client-side safely in descending order
        prodList.sort((a, b) => b.time - a.time);
        setProducts(prodList);
        setDbState("connected");
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "products");
        addToast("error", "Error listening to products feed. Check Firestore permissions.");
        setDbState("error");
      }
    );

    // 2. Snapshot Listener for orders
    const qOrders = collection(db, "orders");
    const unsubOrders = onSnapshot(
      qOrders,
      (snapshot) => {
        const orderList: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const itemsSize = Array.isArray(data.items) && data.items.length > 0 
            ? (data.items[0].selectedSize || data.items[0].size) 
            : "";
          const finalSize = data.size || data.selectedSize || itemsSize || "";

          orderList.push({
            id: doc.id,
            trackingNumber: data.trackingNumber || "",
            productName: data.productName || "",
            productPrice: Number(data.productPrice) || 0,
            customerName: data.customerName || "",
            customerPhone: data.customerPhone || "",
            customerAddress: data.customerAddress || "",
            deliveryCharge: Number(data.deliveryCharge) || 0,
            status: data.status || "Pending",
            paymentMethod: data.paymentMethod || "COD",
            transactionId: data.transactionId || "",
            size: finalSize,
            selectedSize: finalSize,
            time: Number(data.time) || Date.now(),
          });
        });
        // Sort client-side safely in descending order
        orderList.sort((a, b) => b.time - a.time);
        setOrders(orderList);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "orders");
        addToast("error", "Error loading customer orders ledger.");
        setLoading(false);
      }
    );

    // 3. Snapshot Listener for users directory
    const qUsers = collection(db, "users");
    const unsubUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const userList: UserType[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userList.push({
            uid: data.uid || doc.id,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            role: data.role || "customer",
            createdAt: Number(data.createdAt || data.time) || Date.now(),
          });
        });
        // Sort newest registered users first
        userList.sort((a, b) => b.createdAt - a.createdAt);
        setUsers(userList);
        setUsersPermissionError(false);
      },
      (error) => {
        console.warn("Firestore Notice: 'users' list query restricted by security rules. Displaying helper setup screen inside the tab.", error);
        setUsersPermissionError(true);
      }
    );

    // 4. Snapshot Listener for unread customer chats with Local sync fallback
    const qChats = collection(db, "chat_sessions");
    const unsubChats = onSnapshot(
      qChats,
      (snapshot) => {
        let unread = 0;
        snapshot.forEach((doc) => {
          if (doc.data().unreadByAdmin) {
            unread++;
          }
        });
        setUnreadChatCount(unread);
      },
      (error) => {
        console.warn("Firestore Chat Listener Notice (using local sync fallbacks): ", error);
        localStorage.setItem("firebase_chat_local_fallback", "true");
        window.dispatchEvent(new Event("storage_sync_event"));
      }
    );

    const loadUnreadCountLocally = () => {
      const sessionsRaw = localStorage.getItem("local_chat_sessions");
      if (sessionsRaw) {
        try {
          const sessions = JSON.parse(sessionsRaw);
          const unread = sessions.filter((s: any) => s.unreadByAdmin).length;
          setUnreadChatCount((prev) => (unread > 0 ? unread : prev));
        } catch (e) {}
      }
    };
    
    window.addEventListener("storage", loadUnreadCountLocally);
    window.addEventListener("storage_sync_event", loadUnreadCountLocally);
    const countInterval = setInterval(loadUnreadCountLocally, 1000);

    return () => {
      unsubProducts();
      unsubOrders();
      unsubUsers();
      unsubChats();
      window.removeEventListener("storage", loadUnreadCountLocally);
      window.removeEventListener("storage_sync_event", loadUnreadCountLocally);
      clearInterval(countInterval);
    };
  }, []);

  // Pending Count Badge
  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === "Pending").length;
  }, [orders]);

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-slate-950 font-sans">
        <AdminLogin
          onLoginSuccess={() => setIsLoggedIn(true)}
          addToast={addToast}
        />
        <CustomerChatWidget />
        {/* Toast Manager Node */}
        <Toast toasts={toasts} onClose={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased flex flex-col md:flex-row">
      
      {/* 1. LEFT SIDEBAR NAVIGATION BLOCK (no-print) */}
      <aside className="w-full md:w-64 bg-[#0f172a] text-slate-300 shrink-0 border-r border-slate-800 flex flex-col no-print select-none">
        
        {/* Brand header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/25 shadow-xs">
            <Sliders className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-white block">SmartHaatBD</span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold uppercase">Admin core v2.0</span>
          </div>
        </div>
        
        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5">
          {/* Dashboard Home Toggle */}
          <button
            onClick={() => setActiveTab("dashboardHome")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "dashboardHome"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Home</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F5
            </span>
          </button>

          {/* Add product tab toggle */}
          <button
            onClick={() => setActiveTab("productSection")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "productSection"
                ? "bg-slate-800/80 text-white border border-slate-700 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <PlusCircle className="w-4 h-4" />
              <span>Add Product</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F1
            </span>
          </button>

          {/* Manage active ads tab toggle */}
          <button
            onClick={() => setActiveTab("manageProducts")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "manageProducts"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Package className="w-4 h-4" />
              <span>Manage Ads</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F2
            </span>
          </button>

          {/* Payment gateway settings tab toggle */}
          <button
            onClick={() => setActiveTab("paymentSection")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "paymentSection"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4" />
              <span>Payment Settings</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F3
            </span>
          </button>

          {/* Manage orders tab toggle */}
          <button
            onClick={() => setActiveTab("ordersSection")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "ordersSection"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4" />
              <span>Manage Orders</span>
            </span>
            
            <span className="flex items-center gap-2">
              {pendingOrdersCount > 0 && (
                <span className="bg-rose-500 border border-rose-400/20 text-white font-black text-[10px] font-mono px-2 py-0.5 rounded-full select-none animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}
              <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
                F4
              </span>
            </span>
          </button>

          {/* Payment & Order Tracking F6 Tab Toggle */}
          <button
            onClick={() => setActiveTab("trackingSection")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "trackingSection"
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Tracking Ledger</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F6
            </span>
          </button>

          {/* Registered Users F7 Tab Toggle */}
          <button
            onClick={() => setActiveTab("usersSection")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "usersSection"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Registered Users</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F7
            </span>
          </button>

          {/* Live Messages F8 Tab Toggle */}
          <button
            id="admin-messages-tab"
            onClick={() => setActiveTab("messages")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "messages"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4" />
              <span>Live Messages</span>
            </span>
            <span className="flex items-center gap-1.5">
              {unreadChatCount > 0 && (
                <span className="bg-rose-500 text-white font-black text-[9px] font-mono px-2 py-0.5 rounded-full select-none animate-pulse">
                  {unreadChatCount}
                </span>
              )}
              <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
                F8
              </span>
            </span>
          </button>

          {/* Customer Reviews F9 Tab Toggle */}
          <button
            onClick={() => setActiveTab("reviews")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "reviews"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Star className="w-4 h-4 fill-current text-amber-500/20" />
              <span>Reviews & Ratings</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F9
            </span>
          </button>

          {/* Promo Code Management F10 Tab Toggle */}
          <button
            onClick={() => setActiveTab("promoCodes")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "promoCodes"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Ticket className="w-4 h-4" />
              <span>Promo / Coupons</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F10
            </span>
          </button>

          {/* Footer & Branding Settings F11 Tab Toggle */}
          <button
            onClick={() => setActiveTab("footerSettings")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-200 cursor-pointer ${
              activeTab === "footerSettings"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/10 shadow-xs"
                : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Globe className="w-4 h-4" />
              <span>Footer Settings</span>
            </span>
            <span className="text-[10px] bg-slate-800/80 text-slate-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-mono">
              F11
            </span>
          </button>
        </nav>

        {/* Dynamic Identity & Clock card footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 shadow-xs">
            <div className="p-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="truncate flex-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wide">
                {globalSettings?.footerDeveloperName || "MD KAZI SAGOR"}
              </span>
              <span className="text-white text-[11px] select-all block truncate font-mono" title={globalSettings?.footerEmail || "kazicom03@gmail.com"}>
                {globalSettings?.footerEmail || "kazicom03@gmail.com"}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => {
              localStorage.removeItem("isAdminLoggedIn");
              setIsLoggedIn(false);
              addToast("info", "সুরক্ষিতভাবে লগআউট করা হয়েছে। (Logged out securely!)");
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-800 hover:border-rose-500/35 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 text-xs font-semibold rounded-xl transition duration-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Secure Log Out</span>
          </button>
        </div>

      </aside>

      {/* 2. MAIN HUB DATA WRAPPER */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto no-print space-y-6">
        
        {/* Top Header Block */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 select-none no-print">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Admin Control Center</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Control live shopfront database feeds, gate accounts and download print billing receipts</p>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap font-mono">
            {/* Live Clock Indicator */}
            <div className="bg-white border border-slate-100 rounded-xl shadow-xs py-1.5 px-3 flex items-center gap-2 text-[11px] text-slate-500 font-bold">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{timeStr || "--:--:--"}</span>
            </div>

            {/* Live Database Sync Indicator */}
            <div className={`rounded-xl border shadow-xs py-1.5 px-3 flex items-center gap-2 text-[11px] font-bold ${
              dbState === "connected"
                ? "bg-emerald-50 border-emerald-100/50 text-emerald-600"
                : dbState === "connecting"
                ? "bg-amber-50 border-amber-100/50 text-amber-600"
                : "bg-rose-50 border-rose-100/50 text-rose-600"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${
                dbState === "connected" ? "bg-emerald-500" : dbState === "connecting" ? "bg-amber-500 animate-ping" : "bg-rose-500 animate-pulse"
              }`}></span>
              <span>{dbState === "connected" ? "Sync Ready" : dbState === "connecting" ? "Connecting Firestore..." : "Connection Lost"}</span>
            </div>
          </div>
        </header>

        {/* Global Stats bar */}
        {activeTab !== "dashboardHome" && activeTab !== "messages" && activeTab !== "reviews" && activeTab !== "promoCodes" && (
          <StatsOverview orders={orders} products={products} />
        )}

        {/* Loader Screen in background while fetching snapshot */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-20 p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3 shrink-0" />
            <h3 className="text-xs font-bold text-slate-700">Syncing Cloud Services</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Contacting private database buckets...</p>
          </div>
        ) : (
          /* Segment View Controller (Tab content with premium look and feel) */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="min-h-[400px]"
            >
              {activeTab === "dashboardHome" && (
                <DashboardHome 
                  orders={orders} 
                  products={products} 
                  addToast={addToast} 
                  onNavigateToTab={setActiveTab} 
                />
              )}
              {activeTab === "productSection" && (
                <ProductSection products={products} addToast={addToast} />
              )}
              {activeTab === "manageProducts" && (
                <ManageProducts 
                  products={products} 
                  addToast={addToast} 
                  onNavigateToAdd={() => setActiveTab("productSection")}
                />
              )}
              {activeTab === "paymentSection" && (
                <PaymentSection addToast={addToast} />
              )}
              {activeTab === "ordersSection" && (
                <OrdersSection orders={orders} products={products} onOpenDetails={setSelectedOrderId} />
              )}
              {activeTab === "trackingSection" && (
                <TrackingSection 
                  orders={orders} 
                  onOpenDetails={setSelectedOrderId} 
                  addToast={addToast} 
                />
              )}
              {activeTab === "usersSection" && (
                <UsersSection 
                  users={users} 
                  orders={orders}
                  addToast={addToast} 
                  permissionError={usersPermissionError}
                />
              )}
              {activeTab === "messages" && (
                <AdminMessages addToast={addToast} />
              )}
              {activeTab === "reviews" && (
                <ReviewsSection products={products} addToast={addToast} />
              )}
              {activeTab === "promoCodes" && (
                <PromoCodesSection addToast={addToast} />
              )}
              {activeTab === "footerSettings" && (
                <FooterSettingsSection addToast={addToast} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* 3. MODALS AND FLOATING PANELS */}
      <AnimatePresence>
        {selectedOrderId && (
          <InvoiceModal
            orderId={selectedOrderId}
            orders={orders}
            onClose={() => setSelectedOrderId(null)}
            addToast={addToast}
          />
        )}
      </AnimatePresence>

      {/* Toast Manager Node */}
      <Toast toasts={toasts} onClose={removeToast} />

    </div>
  );
}
