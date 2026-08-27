"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Mail, Search, User, MessageSquare, Reply, Clock, Send, CheckCircle2, ChevronRight, Phone, Briefcase, Edit3, RefreshCw, AlertCircle } from "lucide-react";
import { collection, getDocs, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast, Toaster } from "sonner";

const sanitizeMessage = (text: string) => {
  if (!text) return "";
  const stripRegex = new RegExp("<[^>]*>?", "gm");
  return text.split("<br>").join("\n").replace(stripRegex, "").trim();
};

interface RawMessage {
  id: string;
  email: string;
  customerName?: string;
  customerPhone?: string;
  customerNiche?: string;
  message?: string;
  customerRequest?: string;
  finalResponse?: string;
  aiDraft?: string;
  status?: string;
  subject?: string;
  source?: string;
  createdAt?: any;
}

interface Conversation {
  email: string;
  name: string;
  phone?: string;
  niche?: string;
  hasPendingDraft: boolean;
  messages: {
    id: string;
    type: "inbound" | "outbound" | "ai_reply" | "draft";
    text: string;
    timestamp: Date;
    sender: "client" | "ai" | "system";
    rawDocId?: string;
    aiDraft?: string;
    subject?: string;
    status?: string;
  }[];
  lastActivity: Date;
}

export default function InboxChatCRM() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftText, setDraftText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const buildConversations = useCallback((inqDocs: RawMessage[], leadDocs: any[]) => {
    const convosMap = new Map<string, Conversation>();

    inqDocs.forEach((data) => {
      const email = data.email?.toLowerCase().trim();
      if (!email) return;

      if (!convosMap.has(email)) {
        convosMap.set(email, {
          email,
          name: data.customerName || email.split("@")[0],
          phone: data.customerPhone,
          niche: data.customerNiche,
          hasPendingDraft: false,
          messages: [],
          lastActivity: new Date(0),
        });
      }

      const convo = convosMap.get(email)!;
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();

      if (data.message || data.customerRequest) {
        convo.messages.push({
          id: data.id + "_in",
          type: "inbound",
          sender: "client",
          text: data.message || data.customerRequest || "",
          timestamp: createdAt,
          rawDocId: data.id,
          subject: data.subject,
          status: data.status,
        });
      }

      if (data.status === "DRAFT" && data.aiDraft) {
        convo.hasPendingDraft = true;
        convo.messages.push({
          id: data.id + "_draft",
          type: "draft",
          sender: "ai",
          text: data.aiDraft,
          timestamp: new Date(createdAt.getTime() + 500),
          rawDocId: data.id,
          aiDraft: data.aiDraft,
          subject: data.subject,
          status: "DRAFT",
        });
      } else if (data.finalResponse || data.aiDraftResponse) {
        convo.messages.push({
          id: data.id + "_ai",
          type: "ai_reply",
          sender: "ai",
          text: data.finalResponse || data.aiDraftResponse || "",
          timestamp: new Date(createdAt.getTime() + 1000),
        });
      }
    });

    leadDocs.forEach((data) => {
      const email = (data.clientEmail || data.email || "").toLowerCase().trim();
      if (!email) return;
      if (!convosMap.has(email)) {
        convosMap.set(email, {
          email,
          name: data.businessName || email.split("@")[0],
          hasPendingDraft: false,
          messages: [],
          lastActivity: new Date(0),
        });
      }
      const convo = convosMap.get(email)!;
      const sentAt = new Date(data.sentAt || data.lastContactedAt || Date.now());
      if (data.lastMessage) {
        convo.messages.push({
          id: data.id + "_out",
          type: "outbound",
          sender: "system",
          text: data.lastMessage,
          timestamp: sentAt,
        });
      }
    });

    const finalConvos = Array.from(convosMap.values()).map((convo) => {
      convo.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (convo.messages.length > 0) {
        convo.lastActivity = convo.messages[convo.messages.length - 1].timestamp;
      }
      return convo;
    });

    finalConvos.sort((a, b) => {
      if (a.hasPendingDraft && !b.hasPendingDraft) return -1;
      if (!a.hasPendingDraft && b.hasPendingDraft) return 1;
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });

    return finalConvos;
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const inqSnap = await getDocs(collection(db, "contact_messages"));
      const inqDocs: RawMessage[] = [];
      inqSnap.forEach((d) => inqDocs.push({ id: d.id, ...d.data() } as RawMessage));

      const leadsSnap = await getDocs(collection(db, "sent_leads"));
      const leadDocs: any[] = [];
      leadsSnap.forEach((d) => leadDocs.push({ id: d.id, ...d.data() }));

      setConversations(buildConversations(inqDocs, leadDocs));
    } catch (err) {
      console.error("Error fetching CRM data:", err);
      toast.error("فشل في تحميل المحادثات");
    } finally {
      setLoading(false);
    }
  }, [buildConversations]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  useEffect(() => {
    if (selectedEmail) setTimeout(scrollToBottom, 100);
  }, [selectedEmail, conversations]);

  const handleSendDraft = async (docId: string, email: string, subject: string | undefined, overrideText?: string) => {
    const text = overrideText ?? draftText[docId];
    if (!text?.trim()) { toast.error("الرد فارغ"); return; }
    setSending((s) => ({ ...s, [docId]: true }));
    try {
      const res = await fetch("/api/send-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: docId, replyText: text, clientEmail: email, subject }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ تم إرسال الرد للعميل بنجاح!");
        await fetchAllData();
      } else {
        toast.error("فشل الإرسال: " + data.error);
      }
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    } finally {
      setSending((s) => ({ ...s, [docId]: false }));
    }
  };

  const filteredConvos = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConvo = conversations.find((c) => c.email === selectedEmail);

  return (
    <div className="h-[85vh] w-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row" dir="rtl">
      <Toaster position="top-center" richColors />

      {/* Sidebar */}
      <div className={`w-full md:w-1/3 lg:w-1/4 border-l border-slate-100 flex flex-col bg-slate-50 ${selectedEmail ? "hidden md:flex" : "flex"}`}>
        <div className="p-6 border-b border-slate-200 bg-white">
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            محادثات العملاء
          </h1>
          <div className="mt-4 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن عميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
          ) : filteredConvos.length === 0 ? (
            <div className="text-center p-10 text-slate-400 font-medium">لا توجد محادثات.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConvos.map((convo) => {
                const lastMsg = convo.messages[convo.messages.length - 1];
                const isSelected = selectedEmail === convo.email;
                return (
                  <div
                    key={convo.email}
                    onClick={() => setSelectedEmail(convo.email)}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-100 flex items-start gap-3 ${isSelected ? "bg-indigo-50 border-r-4 border-indigo-600" : "border-r-4 border-transparent"}`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 rounded-full flex items-center justify-center font-bold border border-indigo-200">
                        {convo.name.charAt(0).toUpperCase()}
                      </div>
                      {convo.hasPendingDraft && (
                        <span className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-bold text-slate-800 truncate text-sm">{convo.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">
                          {convo.lastActivity.toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        {convo.hasPendingDraft ? (
                          <span className="text-orange-600 font-bold">⏳ ينتظر موافقتك للإرسال</span>
                        ) : (
                          <>
                            {lastMsg?.sender === "ai" ? "🤖: " : lastMsg?.sender === "system" ? "📢: " : ""}
                            {lastMsg?.text || "لا توجد رسائل"}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedEmail ? "hidden md:flex" : "flex"}`}>
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
              <Mail className="w-10 h-10 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-700 mb-2">CRM المحادثات الذكية</h2>
            <p className="text-slate-500 font-medium max-w-sm">اختر عميلاً من القائمة لعرض تاريخ المحادثة ومراجعة ردود مدير التسويق الذكي قبل إرسالها.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="h-20 border-b border-slate-100 px-6 flex items-center justify-between bg-white shrink-0 shadow-sm z-10 w-full min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button onClick={() => setSelectedEmail(null)} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg border border-indigo-200 shrink-0">
                  {selectedConvo.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-lg text-slate-800 leading-tight truncate">{selectedConvo.name}</h2>
                  <p className="text-sm font-medium text-slate-500 flex items-center gap-3 mt-0.5 truncate">
                    <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{selectedConvo.email}</span></span>
                    {selectedConvo.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3 shrink-0" />{selectedConvo.phone}</span>}
                  </p>
                </div>
              </div>
              {selectedConvo.hasPendingDraft && (
                <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-200">
                  <AlertCircle className="w-4 h-4" /> ينتظر موافقتك
                </span>
              )}
              {selectedConvo.niche && !selectedConvo.hasPendingDraft && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                  <Briefcase className="w-4 h-4" />{selectedConvo.niche}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50 space-y-6 w-full min-w-0">
              {selectedConvo.messages.map((msg) => {
                const isClient = msg.sender === "client";
                const isDraft = msg.type === "draft";
                const isAI = msg.sender === "ai" && !isDraft;
                const docId = msg.rawDocId || "";

                if (isDraft) {
                  // Initialize draft text if not set
                  if (draftText[docId] === undefined && msg.aiDraft) {
                    setTimeout(() => setDraftText((d) => ({ ...d, [docId]: d[docId] ?? (msg.aiDraft || "") })), 0);
                  }

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
                      {/* Draft label */}
                      <div className="flex justify-end">
                        <div className="flex items-center gap-2 text-orange-600 text-xs font-bold bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">
                          <Edit3 className="w-3 h-3" />
                          مسودة مدير التسويق — راجع وعدّل ثم أرسل
                        </div>
                      </div>

                      {/* Editable draft bubble */}
                      <div className="flex gap-3 justify-end w-full min-w-0">
                        <div className="max-w-[90%] md:max-w-[75%] flex flex-col items-end min-w-0 w-full">
                          <textarea
                            dir="rtl"
                            rows={6}
                            className="w-full px-5 py-4 rounded-2xl rounded-tl-none border-2 border-orange-300 bg-orange-50 text-slate-800 text-sm font-medium leading-relaxed focus:outline-none focus:border-orange-500 resize-none shadow-sm"
                            value={draftText[docId] ?? msg.aiDraft ?? ""}
                            onChange={(e) => setDraftText((d) => ({ ...d, [docId]: e.target.value }))}
                            placeholder="اكتب ردك هنا..."
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSendDraft(docId, selectedConvo.email, msg.subject, draftText[docId] ?? msg.aiDraft)}
                              disabled={sending[docId]}
                              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition"
                            >
                              {sending[docId] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {sending[docId] ? "جارٍ الإرسال..." : "إرسال للعميل ✓"}
                            </button>
                          </div>
                          <div className="text-[10px] font-bold text-orange-400 mt-1.5 px-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {msg.timestamp.toLocaleDateString("ar-SA")} - {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full flex-none flex items-center justify-center border bg-orange-100 text-orange-700 border-orange-200 text-xs shadow-sm font-bold shrink-0 mt-1">
                          AI
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 w-full min-w-0 ${isClient ? "justify-start" : "justify-end"}`}
                  >
                    {isClient && (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex-none flex items-center justify-center text-xs shadow-sm shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[70%] flex flex-col min-w-0 ${isClient ? "items-start" : "items-end"}`}>
                      <div
                        className={`px-5 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${
                          isClient
                            ? "bg-white border border-slate-200 text-slate-800 rounded-tr-none"
                            : isAI
                            ? "bg-emerald-600 text-white rounded-tl-none"
                            : "bg-orange-50 border border-orange-100 text-slate-800 rounded-tl-none"
                        }`}
                        dir="rtl"
                      >
                        <div className="whitespace-pre-wrap break-words text-right">{sanitizeMessage(msg.text)}</div>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1.5 flex items-center gap-1 px-1">
                        <Clock className="w-3 h-3" />
                        {msg.timestamp.toLocaleDateString("ar-SA")} - {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {!isClient && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-1" />}
                      </div>
                    </div>
                    {!isClient && (
                      <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center border shrink-0 mt-1 ${isAI ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-orange-500 text-white border-orange-600"} text-xs shadow-sm font-bold`}>
                        {isAI ? "AI" : <Send className="w-3 h-3" />}
                      </div>
                    )}
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm font-medium">
                <Reply className="w-5 h-5 text-indigo-400 shrink-0" />
                {selectedConvo.hasPendingDraft
                  ? "مدير التسويق كتب مسودة رد — راجعها أعلاه وأرسلها بعد موافقتك."
                  : "مدير التسويق الذكي سيكتب مسودة رد عند استلام رسائل جديدة."}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
