import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, User, Phone, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, setDoc, addDoc, collection, onSnapshot, query, orderBy, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firestoreError";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export function CustomerChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  // To handle first-time visitor info capturing
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize guest identity
  useEffect(() => {
    let savedId = localStorage.getItem("chat_customer_id");
    let savedName = localStorage.getItem("chat_customer_name");
    let savedPhone = localStorage.getItem("chat_customer_phone");

    if (!savedId) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      savedId = `guest_${Date.now()}_${randNum}`;
      localStorage.setItem("chat_customer_id", savedId);
    }
    setCustomerId(savedId);

    if (savedName) {
      setCustomerName(savedName);
      setTempName(savedName);
      setIsSetupDone(true);
    } else {
      // Set default name until they choose one
      const suffix = savedId.substring(savedId.length - 4);
      const defName = `Guest #${suffix}`;
      setCustomerName(defName);
      setTempName("");
    }

    if (savedPhone) {
      setCustomerPhone(savedPhone);
      setTempPhone(savedPhone);
    }
  }, []);

  const [useLocalFallback, setUseLocalFallback] = useState(() => {
    return localStorage.getItem("firebase_chat_local_fallback") === "true";
  });

  // Sync real-time messages when widget is open and customerId is set
  useEffect(() => {
    if (!customerId) return;
    if (useLocalFallback) return;

    const sessionRef = doc(db, "chat_sessions", customerId);
    const messagesCol = collection(sessionRef, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // If snapshot successfully fetches real-time data, clear local fallback setting
        if (localStorage.getItem("firebase_chat_local_fallback") === "true") {
          localStorage.removeItem("firebase_chat_local_fallback");
          setUseLocalFallback(false);
          window.dispatchEvent(new Event("storage_sync_event"));
        }

        const list: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            senderId: data.senderId || "",
            text: data.text || "",
            timestamp: Number(data.timestamp) || Date.now(),
          });
        });
        setMessages(list);

        // Clear own unread count when reading active replies
        if (isOpen && list.length > 0) {
          try {
            // Get current session data to keep integrity
            getDoc(sessionRef).then((sSnap) => {
              if (sSnap.exists() && sSnap.data().unreadByCustomer) {
                setDoc(sessionRef, { unreadByCustomer: false }, { merge: true }).catch((err) => {
                  console.error("Error setting read status: ", err);
                });
              }
            });
          } catch (error) {
            console.warn("Could not mark as read: ", error);
          }
        }
      },
      (error) => {
        console.warn("Firestore error on chat messages stream, falling back to local storage sync:", error);
        localStorage.setItem("firebase_chat_local_fallback", "true");
        setUseLocalFallback(true);
        window.dispatchEvent(new Event("storage_sync_event"));
        handleFirestoreError(error, OperationType.LIST, `chat_sessions/${customerId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [customerId, isOpen, useLocalFallback]);

  // Sync real-time local fallback messages
  useEffect(() => {
    if (!customerId || !useLocalFallback) return;

    const loadLocalMessages = () => {
      const stored = localStorage.getItem(`local_messages_${customerId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMessages(parsed);
        } catch (e) {
          console.error("Failed to parse local messages", e);
        }
      } else {
        setMessages([]);
      }

      // Mark unreadByCustomer as false locally
      const sessionsRaw = localStorage.getItem("local_chat_sessions");
      if (sessionsRaw) {
        try {
          const sessions = JSON.parse(sessionsRaw);
          const index = sessions.findIndex((s: any) => s.customerId === customerId);
          if (index > -1 && sessions[index].unreadByCustomer) {
            sessions[index].unreadByCustomer = false;
            localStorage.setItem("local_chat_sessions", JSON.stringify(sessions));
            window.dispatchEvent(new Event("storage_sync_event"));
          }
        } catch (e) {}
      }
    };

    loadLocalMessages();

    // Listen to tab sync events
    const handleSync = () => {
      loadLocalMessages();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("storage_sync_event", handleSync);
    const interval = setInterval(loadLocalMessages, 1000);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("storage_sync_event", handleSync);
      clearInterval(interval);
    };
  }, [customerId, useLocalFallback, isOpen]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isSetupDone]);

  // Setup/Submit guest profile details
  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = tempName.trim() || customerName; // fallback to Guest #XXXX
    const finalPhone = tempPhone.trim();

    localStorage.setItem("chat_customer_name", finalName);
    localStorage.setItem("chat_customer_phone", finalPhone);

    setCustomerName(finalName);
    setCustomerPhone(finalPhone);
    setIsSetupDone(true);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !customerId) return;

    const messageText = inputVal.trim();
    setInputVal("");

    const timestamp = Date.now();

    if (useLocalFallback) {
      // Use Local Fallback
      const newMessage = {
        id: `msg_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        senderId: customerId,
        text: messageText,
        timestamp,
      };

      // 1. Add individual message
      const msgKey = `local_messages_${customerId}`;
      const existingRaw = localStorage.getItem(msgKey);
      let list = [];
      if (existingRaw) {
        try {
          list = JSON.parse(existingRaw);
        } catch (e) {}
      }
      list.push(newMessage);
      localStorage.setItem(msgKey, JSON.stringify(list));
      setMessages(list);

      // 2. Set overall status on parent session tracker
      const sessionsKey = "local_chat_sessions";
      const sessionsRaw = localStorage.getItem(sessionsKey);
      let sessionsList = [];
      if (sessionsRaw) {
        try {
          sessionsList = JSON.parse(sessionsRaw);
        } catch (e) {}
      }

      const existingIndex = sessionsList.findIndex((s: any) => s.customerId === customerId);
      const sessionItem = {
        id: customerId,
        customerId,
        customerName,
        customerPhone,
        lastMessage: messageText,
        lastActive: timestamp,
        unreadByAdmin: true,
        unreadByCustomer: false,
      };

      if (existingIndex > -1) {
        sessionsList[existingIndex] = { ...sessionsList[existingIndex], ...sessionItem };
      } else {
        sessionsList.push(sessionItem);
      }
      sessionsList.sort((a: any, b: any) => b.lastActive - a.lastActive);
      localStorage.setItem(sessionsKey, JSON.stringify(sessionsList));

      window.dispatchEvent(new Event("storage_sync_event"));
      return;
    }

    const sessionRef = doc(db, "chat_sessions", customerId);
    const messagesCol = collection(sessionRef, "messages");

    const newMessage = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      senderId: customerId,
      text: messageText,
      timestamp,
    };

    try {
      // 1. Add individual message
      await setDoc(doc(messagesCol, newMessage.id), newMessage);

      // 2. Update session overview document (keeps it in sync)
      await setDoc(
        sessionRef,
        {
          customerId,
          customerName,
          customerPhone,
          lastMessage: messageText,
          lastActive: timestamp,
          unreadByAdmin: true,
          unreadByCustomer: false,
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Firestore error on message send. Attempting local storage rollback path:", error);
      localStorage.setItem("firebase_chat_local_fallback", "true");
      setUseLocalFallback(true);
      // Run helper write as fallback
      const msgKey = `local_messages_${customerId}`;
      localStorage.setItem(msgKey, JSON.stringify([newMessage]));
      setMessages([newMessage]);
      
      const sessionsKey = "local_chat_sessions";
      localStorage.setItem(sessionsKey, JSON.stringify([{
        id: customerId,
        customerId,
        customerName,
        customerPhone,
        lastMessage: messageText,
        lastActive: timestamp,
        unreadByAdmin: true,
        unreadByCustomer: false,
      }]));
      window.dispatchEvent(new Event("storage_sync_event"));
      handleFirestoreError(error, OperationType.WRITE, `chat_sessions/${customerId}/messages`);
    }
  };

  // Suffix helper for header avatar
  const avatarInitials = customerName
    ? customerName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "G";

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none font-sans no-print">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chat-window-container"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-80 sm:w-[350px] h-[480px] rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header section with brand and visitor details */}
            <div className="bg-[#0f172a] p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm tracking-wide">
                  {avatarInitials}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight truncate max-w-[160px]">{customerName}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-medium">Customer Support Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition duration-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main view router */}
            {!isSetupDone ? (
              /* Setup Screen: Capture user details first */
              <div className="flex-1 p-6 flex flex-col justify-between bg-slate-50">
                <div className="space-y-4">
                  <div className="text-center pb-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-3">
                      <MessageSquare className="w-5 h-5 animate-bounce" />
                    </div>
                    <h4 className="font-extrabold text-slate-900 tracking-tight text-sm">চ্যাট শুরু করুন (Start Chat)</h4>
                    <p className="text-[11px] text-slate-400 mt-1 px-4 leading-relaxed">
                      এডমিনের সাথে সরাসরি কথা বলতে নিজের নাম ও মোবাইল নম্বর দিন।
                    </p>
                  </div>

                  <form id="chat-setup-form" onSubmit={handleSetupSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">আপনার নাম (Your Name) *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder="যেমন: আসিফ রহমান"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:border-emerald-500 transition text-slate-800 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">মোবাইল নম্বর (Phone) - ঐচ্ছিক</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                          placeholder="যেমন: 017xxxxxxxx"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:border-emerald-500 transition text-slate-800 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#0f172a] hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-slate-950/10 hover:shadow-lg cursor-pointer mt-2"
                    >
                      <span>চ্যাট করুন (Start Conversation)</span>
                    </button>
                  </form>
                </div>

                <p className="text-[10px] text-center text-slate-400">
                  সরাসরি কথা বলতে চাইলে ইনস্ট্যান্ট যুক্ত হোন।
                </p>
              </div>
            ) : (
              /* Actual Chat Window: messages loop & instant input */
              <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
                {/* 1. Reset setup bar option */}
                <div className="bg-slate-100 hover:bg-slate-200/80 transition px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 border-b border-slate-200 cursor-pointer" onClick={() => setIsSetupDone(false)}>
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">Name: {customerName} {customerPhone ? `(${customerPhone})` : ""}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 font-bold shrink-0">
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Change</span>
                  </div>
                </div>

                {/* 2. Messages lists container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/25 mb-3">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-700">কোন মেসেজ নেই</h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        একটি মেসেজ লিখে এডমিনের সাথে লাইভ চ্যাট শুরু করুন।
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === customerId;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed shadow-xs ${
                              isMe
                                ? "bg-[#0f172a] text-white rounded-tr-none"
                                : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                            }`}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[9px] text-slate-400/80 font-mono mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 3. Input Message Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-white border-t border-slate-100 flex items-center gap-2.5 select-none"
                >
                  <input
                    id="chat-message-input"
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1 bg-white border border-slate-200 rounded-2xl px-4.5 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0f172a]/5 focus:border-slate-400 text-slate-800 transition placeholder:text-slate-400"
                  />
                  <button
                    id="chat-send-btn"
                    type="submit"
                    disabled={!inputVal.trim()}
                    className={`p-2.5 rounded-xl transition duration-200 shrink-0 select-none border ${
                      inputVal.trim()
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border-slate-200/50 cursor-pointer"
                        : "bg-slate-50 text-slate-400/40 border-slate-100 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular floating action toggle button */}
      <motion.button
        id="chat-widget-toggle"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-13 h-13 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white flex items-center justify-center shadow-xl border border-slate-800 cursor-pointer relative"
      >
        <MessageSquare className="w-6 h-6" />
        
        {/* Simple red dot indicator if there is an unread message */}
        {messages.some((m) => m.senderId !== customerId) && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-bounce"></span>
        )}
      </motion.button>
    </div>
  );
}
