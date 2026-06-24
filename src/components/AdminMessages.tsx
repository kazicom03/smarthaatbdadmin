import React, { useState, useEffect, useRef, useMemo } from "react";
import { MessageSquare, Send, Search, Trash2, Clock, User, Phone, CheckCheck, Sparkles, Filter, AlertCircle, Trash, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../firestoreError";

interface ChatSession {
  id: string; // matches customerId
  customerId: string;
  customerName: string;
  customerPhone?: string;
  lastMessage: string;
  lastActive: number;
  unreadByAdmin: boolean;
  unreadByCustomer: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface AdminMessagesProps {
  addToast: (type: "success" | "error" | "info", text: string) => void;
}

export function AdminMessages({ addToast }: AdminMessagesProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "guests" | "unread">("all");
  const [purgedCount, setPurgedCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    addToast("success", "Customer ID copied to clipboard!");
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [useLocalFallback, setUseLocalFallback] = useState(() => {
    return localStorage.getItem("firebase_chat_local_fallback") === "true";
  });

  // 1. Listen to real-time chat sessions list OR local fallback
  useEffect(() => {
    if (useLocalFallback) {
      const loadLocalSessions = () => {
        const stored = localStorage.getItem("local_chat_sessions");
        if (stored) {
          try {
            setSessions(JSON.parse(stored));
          } catch (e) {
            console.error("Local sync session parse error:", e);
          }
        } else {
          setSessions([]);
        }
      };

      loadLocalSessions();

      const handleSync = () => {
        loadLocalSessions();
      };

      window.addEventListener("storage", handleSync);
      window.addEventListener("storage_sync_event", handleSync);
      const interval = setInterval(loadLocalSessions, 1000);

      return () => {
        window.removeEventListener("storage", handleSync);
        window.removeEventListener("storage_sync_event", handleSync);
        clearInterval(interval);
      };
    }

    const q = query(collection(db, "chat_sessions"), orderBy("lastActive", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // If snapshot succeeds, reset fallback to ensure we are using Firebase Live database
        if (localStorage.getItem("firebase_chat_local_fallback") === "true") {
          localStorage.removeItem("firebase_chat_local_fallback");
          setUseLocalFallback(false);
          window.dispatchEvent(new Event("storage_sync_event"));
          addToast("success", "Firebase database connection established successfully (Live Database Active).");
        }

        const list: ChatSession[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            customerId: data.customerId || doc.id,
            customerName: data.customerName || "Anonymous Guest",
            customerPhone: data.customerPhone || "",
            lastMessage: data.lastMessage || "",
            lastActive: Number(data.lastActive) || Date.now(),
            unreadByAdmin: !!data.unreadByAdmin,
            unreadByCustomer: !!data.unreadByCustomer,
          });
        });
        setSessions(list);

        // Run automatic cleanup on database emissions for 1-week old Guests
        let expiredGuests: ChatSession[] = [];
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        list.forEach((session) => {
          if (session.customerId.startsWith("guest_") && session.lastActive < sevenDaysAgo) {
            expiredGuests.push(session);
          }
        });

        if (expiredGuests.length > 0) {
          purgeExpiredGuestSessions(expiredGuests);
        }
      },
      (error) => {
        console.warn("Firestore error on chat sessions listing, falling back to local storage sync:", error);
        localStorage.setItem("firebase_chat_local_fallback", "true");
        setUseLocalFallback(true);
        window.dispatchEvent(new Event("storage_sync_event"));
        handleFirestoreError(error, OperationType.LIST, "chat_sessions");
        addToast("error", "Error loading customer chats stream. Local replication fallback active.");
      }
    );

    return () => unsubscribe();
  }, [addToast, useLocalFallback]);

  // Purge older guest sessions and their subcollection messages manually/automatically
  const purgeExpiredGuestSessions = async (expiredSessions: ChatSession[]) => {
    let count = 0;
    for (const session of expiredSessions) {
      try {
        const sessionRef = doc(db, "chat_sessions", session.customerId);
        
        // Retrieve and delete subcollection messages first to prevent orphans
        const messagesCol = collection(sessionRef, "messages");
        const messagesSnap = await getDocs(messagesCol);
        for (const mDoc of messagesSnap.docs) {
          await deleteDoc(doc(messagesCol, mDoc.id));
        }

        // Delete primary session entry
        await deleteDoc(sessionRef);
        count++;
      } catch (err) {
        console.error("Failed to delete expired session: ", session.customerId, err);
      }
    }
    if (count > 0) {
      setPurgedCount((prev) => prev + count);
      addToast("info", `${count} expired guest chats auto-purged after 1 week.`);
    }
  };

  // 2. Listen to active message flow when a chat is selected
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    if (useLocalFallback) {
      const loadLocalSelectedMessages = () => {
        const stored = localStorage.getItem(`local_messages_${selectedSessionId}`);
        if (stored) {
          try {
            setMessages(JSON.parse(stored));
          } catch (e) {
            console.error("Local sync messages parse error:", e);
          }
        } else {
          setMessages([]);
        }

        // Mark unreadByAdmin as false locally
        const sessionsRaw = localStorage.getItem("local_chat_sessions");
        if (sessionsRaw) {
          try {
            const sessions = JSON.parse(sessionsRaw);
            const index = sessions.findIndex((s: any) => s.customerId === selectedSessionId);
            if (index > -1 && sessions[index].unreadByAdmin) {
              sessions[index].unreadByAdmin = false;
              localStorage.setItem("local_chat_sessions", JSON.stringify(sessions));
              window.dispatchEvent(new Event("storage_sync_event"));
            }
          } catch (e) {}
        }
      };

      loadLocalSelectedMessages();

      const handleSync = () => {
        loadLocalSelectedMessages();
      };

      window.addEventListener("storage", handleSync);
      window.addEventListener("storage_sync_event", handleSync);
      const interval = setInterval(loadLocalSelectedMessages, 1000);

      return () => {
        window.removeEventListener("storage", handleSync);
        window.removeEventListener("storage_sync_event", handleSync);
        clearInterval(interval);
      };
    }

    const sessionRef = doc(db, "chat_sessions", selectedSessionId);
    
    // Mark as Read for Admin
    try {
      updateDoc(sessionRef, { unreadByAdmin: false }).catch((err) => {
        console.error("Error setting admin read status: ", err);
      });
    } catch (e) {
      console.warn("Could not write read status update.", e);
    }

    const messagesCol = collection(sessionRef, "messages");
    const q = query(messagesCol, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Successful list fetch clears local fallback
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
      },
      (error) => {
        console.warn("Firestore error on selected chat messages, falling back to local storage sync:", error);
        localStorage.setItem("firebase_chat_local_fallback", "true");
        setUseLocalFallback(true);
        window.dispatchEvent(new Event("storage_sync_event"));
        handleFirestoreError(error, OperationType.LIST, `chat_sessions/${selectedSessionId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [selectedSessionId, useLocalFallback]);

  // Scroll active window of messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedSessionId]);

  // Reply message sender
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSessionId) return;

    const msgText = replyText.trim();
    setReplyText("");

    const timestamp = Date.now();

    if (useLocalFallback) {
      const newMessage = {
        id: `msg_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        senderId: "admin",
        text: msgText,
        timestamp,
      };

      // 1. Add replies locally
      const msgKey = `local_messages_${selectedSessionId}`;
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

      // 2. Set overall status on parent session tracker locally
      const sessionsKey = "local_chat_sessions";
      const sessionsRaw = localStorage.getItem(sessionsKey);
      let sessionsList = [];
      if (sessionsRaw) {
        try {
          sessionsList = JSON.parse(sessionsRaw);
        } catch (e) {}
      }

      const existingIndex = sessionsList.findIndex((s: any) => s.customerId === selectedSessionId);
      if (existingIndex > -1) {
        sessionsList[existingIndex] = {
          ...sessionsList[existingIndex],
          lastMessage: msgText,
          lastActive: timestamp,
          unreadByAdmin: false,
          unreadByCustomer: true,
        };
      }
      localStorage.setItem(sessionsKey, JSON.stringify(sessionsList));

      window.dispatchEvent(new Event("storage_sync_event"));
      return;
    }

    const sessionRef = doc(db, "chat_sessions", selectedSessionId);
    const messagesCol = collection(sessionRef, "messages");

    const newMessageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      // 1. Add replies subcollection entry
      await setDoc(doc(messagesCol, newMessageId), {
        id: newMessageId,
        senderId: "admin",
        text: msgText,
        timestamp,
      });

      // 2. Set overall status on parent session tracker
      await updateDoc(sessionRef, {
        lastMessage: msgText,
        lastActive: timestamp,
        unreadByAdmin: false,
        unreadByCustomer: true, // sets alert badge for visitor widget
      });
    } catch (error) {
      console.warn("Firestore error on send reply. Falling back to local replication.", error);
      localStorage.setItem("firebase_chat_local_fallback", "true");
      setUseLocalFallback(true);
      // Run helper write as fallback
      const msgKey = `local_messages_${selectedSessionId}`;
      const newMessage = {
        id: `msg_local_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        senderId: "admin",
        text: msgText,
        timestamp,
      };
      localStorage.setItem(msgKey, JSON.stringify([newMessage]));
      setMessages([newMessage]);
      window.dispatchEvent(new Event("storage_sync_event"));
      handleFirestoreError(error, OperationType.WRITE, `chat_sessions/${selectedSessionId}/messages`);
      addToast("error", "Failed to transfer reply details over Firestore. Local replication fallback active.");
    }
  };

  // Delete chat manually path
  const handleManualDeleteSession = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDeleteId(customerId);
  };

  // Perform actual chat history deletion
  const executeDeleteSession = async () => {
    if (!sessionToDeleteId) return;

    if (useLocalFallback) {
      try {
        localStorage.removeItem(`local_messages_${sessionToDeleteId}`);
        const sessionsRaw = localStorage.getItem("local_chat_sessions");
        if (sessionsRaw) {
          const sessions = JSON.parse(sessionsRaw);
          const filtered = sessions.filter((s: any) => s.customerId !== sessionToDeleteId);
          localStorage.setItem("local_chat_sessions", JSON.stringify(filtered));
        }
        window.dispatchEvent(new Event("storage_sync_event"));
        addToast("success", "Chat session deleted successfully.");
        if (selectedSessionId === sessionToDeleteId) {
          setSelectedSessionId(null);
        }
        setSessionToDeleteId(null);
      } catch (err) {
        console.error("Local delete failed", err);
      }
      return;
    }

    try {
      const sessionRef = doc(db, "chat_sessions", sessionToDeleteId);
      const messagesCol = collection(sessionRef, "messages");
      const messagesSnap = await getDocs(messagesCol);
      
      for (const mDoc of messagesSnap.docs) {
        await deleteDoc(doc(messagesCol, mDoc.id));
      }

      await deleteDoc(sessionRef);
      addToast("success", "Chat session deleted successfully.");
      if (selectedSessionId === sessionToDeleteId) {
        setSelectedSessionId(null);
      }
      setSessionToDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chat_sessions/${sessionToDeleteId}`);
      addToast("error", "Error deleting chat session history.");
    }
  };

  // Find info about session to delete for confirmation dialog
  const sessionToDeleteDetails = useMemo(() => {
    return sessions.find((s) => s.id === sessionToDeleteId) || null;
  }, [sessions, sessionToDeleteId]);

  // Find targeted session
  const activeSessionDetails = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // Filter & Search computation
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Match search query term
      const matchesSearch =
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.customerPhone && s.customerPhone.includes(searchTerm));

      if (!matchesSearch) return false;

      // 2. Filter tabs
      if (filterType === "guests") {
        return s.customerId.startsWith("guest_");
      }
      if (filterType === "unread") {
        return s.unreadByAdmin;
      }
      return true;
    });
  }, [sessions, searchTerm, filterType]);

  return (
    <div id="admin-messages-tab" className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px] select-none">
      
      {/* LEFT COLUMN: Sessions Listing & Filters */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col shrink-0 min-h-0">
        
        {/* Head overview statistics */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-1">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#0f172a] tracking-tight text-sm flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>Live Support Chat</span>
            </h3>
            {purgedCount > 0 && (
              <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full" title="Total guest chats cleaned up automatically after 7 days">
                Cleaned: {purgedCount}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-hidden focus:border-emerald-500 text-slate-800 transition focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          {/* Tab Filter Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-lg">
            <button
              onClick={() => setFilterType("all")}
              className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition ${
                filterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("unread")}
              className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition relative flex items-center justify-center gap-1 ${
                filterType === "unread" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              <span>Unread</span>
              {sessions.some((s) => s.unreadByAdmin) && (
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setFilterType("guests")}
              className={`flex-1 text-[10px] py-1.5 font-bold rounded-md transition ${
                filterType === "guests" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              Guests
            </button>
          </div>
        </div>

        {/* Sessions Scrolling Stream Container */}
        <div id="admin-chat-list" className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0 bg-slate-50/65">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center pt-16">
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Filter className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-500">No conversations found</p>
              <p className="text-[10px] text-slate-400 mt-1">Try another filter or search keyword.</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const isGuest = session.customerId.startsWith("guest_");
              const initials = session.customerName
                ? session.customerName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                : "G";

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition relative ${
                    isSelected ? "bg-white border-l-4 border-emerald-500 shadow-2xs" : "hover:bg-slate-100/50 bg-white"
                  }`}
                >
                  {/* Account Avatar */}
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}>
                    {initials || "G"}
                  </div>

                  {/* Overview Text */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-extrabold truncate ${session.unreadByAdmin ? "text-slate-950" : "text-slate-700"}`}>
                        {session.customerName}
                      </h4>
                      <span className="text-[9px] font-mono text-slate-400 font-medium shrink-0">
                        {new Date(session.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className={`text-[11px] truncate mt-0.5 ${session.unreadByAdmin ? "text-slate-900 font-bold" : "text-slate-400"}`}>
                      {session.lastMessage || "New conversation started..."}
                    </p>

                    {/* Expiry alerts and details */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isGuest ? (
                        <span className="text-[8px] bg-red-50 text-red-500 border border-red-100 font-black px-1.5 py-0.5 rounded-sm" title="Guest session expires automatically after 1 week.">
                          Guest Chat (Auto-purges in 1 week)
                        </span>
                      ) : (
                        <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-black px-1.5 py-0.5 rounded-sm">
                          Registered (User Model)
                        </span>
                      )}
                      
                      {session.customerPhone && (
                        <span className="text-[9px] text-slate-400 font-mono font-medium flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-300" />
                          {session.customerPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Red alert bubble indicator */}
                  {session.unreadByAdmin && (
                    <span className="absolute right-4.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white animate-pulse"></span>
                  )}

                  {/* Manual Trash icon on hover highlight */}
                  <button
                    onClick={(e) => handleManualDeleteSession(session.id, e)}
                    className="absolute right-2.5 bottom-2 p-1.5 hover:bg-slate-100 hover:text-red-500 rounded-lg text-slate-300 transition duration-150 cursor-pointer"
                    title="Delete conversation permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Converstion Chat Flow */}
      <div className="flex-1 bg-slate-50 flex flex-col min-h-0 min-w-0">
        {activeSessionDetails ? (
          <>
            {/* Thread Header Info bar */}
            <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center font-bold text-sm">
                  {activeSessionDetails.customerName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                    <span>{activeSessionDetails.customerName}</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium flex items-center flex-wrap gap-1.5 mt-0.5">
                    <span>ID:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(activeSessionDetails.id)}
                      className="inline-flex items-center gap-1 font-mono font-semibold text-slate-600 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded px-1.5 py-0.5 transition duration-150 cursor-pointer text-[9px] group"
                      title="Click to copy ID"
                    >
                      <span>{activeSessionDetails.id}</span>
                      {copiedId === activeSessionDetails.id ? (
                        <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-500 transition shrink-0" />
                      )}
                    </button>
                    {activeSessionDetails.customerPhone ? (
                      <span className="text-slate-300">• Phone: <strong className="text-slate-500 font-mono">{activeSessionDetails.customerPhone}</strong></span>
                    ) : ""}
                  </p>
                </div>
              </div>

              {/* Status information */}
              <div className="flex items-center gap-2">
                <div className={`hidden sm:flex items-center gap-1.5 border rounded-xl px-2.5 py-1 text-[10px] font-bold ${
                  useLocalFallback 
                    ? "bg-amber-50 text-amber-600 border-amber-100" 
                    : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${useLocalFallback ? "bg-amber-500" : "bg-emerald-500 animate-ping"}`} />
                  <span>{useLocalFallback ? "Offline Fallback" : "Firebase DB: Live"}</span>
                </div>
                <button
                  onClick={(e) => handleManualDeleteSession(activeSessionDetails.id, e)}
                  className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Purge whole chat history"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Thread</span>
                </button>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center pb-12">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mb-3">
                    <MessageSquare className="w-5 h-5 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-700">No chat history records found</h4>
                  <p className="text-[10px] text-slate-404 mt-1 max-w-[240px] text-center leading-relaxed">
                    This customer hasn't sent any messages yet. Start chatting by sending a reply below.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.senderId === "admin";
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      <div className={`flex items-center gap-1.5 text-[9px] text-slate-400 mb-1 px-1 font-bold ${isAdmin ? "justify-end" : ""}`}>
                        {isAdmin ? "Admin (You)" : activeSessionDetails.customerName}
                        <span className="font-mono text-[8px] font-medium text-slate-400/70">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs font-semibold leading-relaxed shadow-3xs ${
                          isAdmin
                            ? "bg-[#0f172a] text-white rounded-tr-none"
                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Form Area */}
            <form onSubmit={handleSendReply} className="p-3.5 bg-white border-t border-slate-100/80 flex items-center gap-3 select-none shrink-0">
              <input
                id="admin-reply-input"
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl md:rounded-3xl px-5 py-3 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0f172a]/5 focus:border-slate-400 text-slate-800 transition shadow-2xs placeholder:text-slate-400"
              />
              <button
                id="admin-reply-send-btn"
                type="submit"
                disabled={!replyText.trim()}
                className={`p-3.5 rounded-2xl transition duration-200 shrink-0 select-none border ${
                  replyText.trim()
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border-slate-200/50 cursor-pointer"
                    : "bg-slate-50 text-slate-400/40 border-slate-100 cursor-not-allowed"
                }`}
                title="Send reply message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* Empty Active Panel Placeholder style */
          <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-xs text-emerald-500 mb-4 animate-bounce">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">Select a Chat Conversation</h3>
            <p className="text-[11px] text-slate-404 max-w-[280px] mt-1.5 leading-relaxed">
              Select any chat from the list on the left to start real-time two-way messaging with customers.
            </p>
          </div>
        )}
      </div>

      {/* Chat History Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDeleteId && (
          <div className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-sm mx-auto"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-rose-100 pb-3 mb-4">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black text-rose-950 uppercase">Delete Chat Thread Confirmation</h3>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you absolutely sure you want to permanently delete this customer's chat thread? This action cannot be undone and will delete all associated messages.
              </p>
              
              <div className="mt-4 bg-slate-50 rounded-2xl border border-slate-100 p-3.5 text-[11px] text-slate-700 font-bold space-y-1.5 select-all">
                <p>👤 Customer: <span className="text-slate-900 font-black">
                  {sessionToDeleteDetails ? sessionToDeleteDetails.customerName : "Unknown Customer"}
                </span></p>
                <p>🆔 Customer ID: <span className="text-slate-900 font-mono font-bold">{sessionToDeleteId}</span></p>
                {sessionToDeleteDetails?.customerPhone && (
                  <p>📞 Phone: <span className="text-slate-900 font-mono font-bold">{sessionToDeleteDetails.customerPhone}</span></p>
                )}
                {sessionToDeleteDetails?.lastMessage && (
                  <p className="line-clamp-2">💬 Last Message: <span className="text-slate-500 italic font-semibold">"{sessionToDeleteDetails.lastMessage}"</span></p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setSessionToDeleteId(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteSession}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash className="w-4 h-4" />
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
