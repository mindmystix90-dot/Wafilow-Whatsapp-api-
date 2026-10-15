"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Search,
  Send,
  CheckCheck,
  Check,
  Phone,
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Conversation {
  id: string;
  name: string;
  phone: string;
  rawPhone: string;
  lastMessage: string;
  lastMessageStatus?: "sent" | "delivered" | "read" | "failed";
  lastMessageDirection?: "inbound" | "outbound";
  time: string;
  unread: number;
  tags: string[];
}

interface ChatMessage {
  id: string;
  wamId?: string;
  sender: "customer" | "agent";
  text: string;
  type?: string;
  time: string;
  timestamp?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  errorMessage?: string;
}

function InboxContent() {
  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get("contactId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(contactIdParam || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // New Chat modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Conversations from Real Database
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations || []);
          if (isInitial && data.conversations?.length > 0 && !selectedId) {
            setSelectedId(data.conversations[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      if (isInitial) setIsLoadingConversations(false);
    }
  }, [selectedId]);

  // 2. Fetch Messages for Selected Conversation
  const fetchMessages = useCallback(async (contactId: string, isInitial = false) => {
    if (isInitial) {
      setTimeout(() => setIsLoadingMessages(true), 0);
    }
    try {
      const res = await fetch(`/api/whatsapp/messages?contactId=${encodeURIComponent(contactId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (isInitial) setIsLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let ignore = false;
    fetch("/api/whatsapp/conversations", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setConversations(data.conversations || []);
          if (data.conversations?.length > 0) {
            setSelectedId((prev) => prev || data.conversations[0].id);
          }
          setIsLoadingConversations(false);
        }
      })
      .catch((err) => {
        console.error("Error loading conversations:", err);
        if (!ignore) setIsLoadingConversations(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Load messages whenever selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    let ignore = false;
    fetch(`/api/whatsapp/messages?contactId=${encodeURIComponent(selectedId)}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setMessages(data.messages || []);
          setIsLoadingMessages(false);
        }
      })
      .catch((err) => {
        console.error("Error loading messages:", err);
        if (!ignore) setIsLoadingMessages(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedId]);

  // Auto-scroll on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh poll every 4 seconds for live webhooks
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false);
      if (selectedId) {
        fetchMessages(selectedId, false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedId, fetchConversations, fetchMessages]);

  const activeConv = conversations.find((c) => c.id === selectedId);

  // 3. Send Message via Real Meta Cloud API
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedId || isSending) return;

    const messageText = inputText.trim();
    setIsSending(true);
    setSendError(null);

    // Optimistic message bubble
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: "agent",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");

    try {
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedId,
          text: messageText,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setSendError(data.error || "Meta WhatsApp Cloud API rejected the message.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: "failed",
                  errorMessage: data.error || "Delivery failed",
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...data.message } : m))
        );
        fetchConversations(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setSendError(`Failed to reach server: ${msg}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, status: "failed", errorMessage: `Network error: ${msg}` }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  // Start new chat with validated phone
  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatNumber.trim()) return;

    setIsStartingChat(true);
    setNewChatError(null);

    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: newChatNumber.trim(),
          messageType: "template",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setNewChatError(data.error || "Failed to initiate conversation with this number.");
      } else {
        setShowNewChat(false);
        setNewChatNumber("");
        await fetchConversations(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setNewChatError(`Network error: ${msg}`);
    } finally {
      setIsStartingChat(false);
    }
  };

  // Filter tab state matching image.png
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "assigned" | "starred" | "archived">("all");
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [assignedAgent, setAssignedAgent] = useState("Orion Edmund");
  const [contactNotes, setContactNotes] = useState("Interested in Pro plan. Follow up next week.");

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);

    if (activeTab === "unread") return matchesSearch && c.unread > 0;
    if (activeTab === "starred") return matchesSearch && c.tags?.includes("Starred");
    if (activeTab === "archived") return matchesSearch && c.tags?.includes("Archived");
    return matchesSearch;
  });

  return (
    <AppLayout
      title="Live Inbox"
      subtitle="Manage and respond to your WhatsApp conversations in real time"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConversations(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      }
    >
      <div className="h-[calc(100vh-210px)] min-h-[580px] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left Pane: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Filter Pills matching image.png */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220] space-y-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Unread ({conversations.filter((c) => c.unread > 0).length})
              </button>
              <button
                onClick={() => setActiveTab("assigned")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "assigned"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setActiveTab("starred")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "starred"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Starred
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "archived"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Archived
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  No Conversations Found
                </div>
                <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                  Incoming WhatsApp messages or outbound template pings will appear here.
                </p>
                <div className="pt-2 flex flex-col gap-2 w-full max-w-[200px]">
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-slate-900 dark:text-white border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-900 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                        {c.name ? c.name[0]?.toUpperCase() : "W"}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute bottom-0 right-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">{c.time}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        {c.lastMessageDirection === "outbound" && (
                          <span className="text-[10px] text-indigo-500 font-semibold">You:</span>
                        )}
                        <span className="truncate">{c.lastMessage}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1">
                          {c.tags && c.tags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {c.unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Center Pane: Active Chat Conversation */}
        <div
          className={`flex-1 flex flex-col h-full bg-white dark:bg-[#0c1220] ${
            !selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Active Conversation Header matching image.png */}
              <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute bottom-0 right-0" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {activeConv.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {activeConv.phone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${activeConv.rawPhone}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Direct Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    className={`p-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      showContactInfo
                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    title="Toggle Contact Info Sidebar"
                  >
                    <span className="hidden sm:inline">Contact Info</span>
                    <span className="sm:hidden">Info</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/30">
                {isLoadingMessages ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">Loading message thread...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="text-xs">No previous messages recorded for this contact.</p>
                    <p className="text-[11px] text-slate-400">Send a greeting or HSM template below to begin.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAgent = m.sender === "agent";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                            isAgent
                              ? "bg-indigo-600 text-white rounded-br-xs"
                              : "bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          <div
                            className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${
                              isAgent ? "text-indigo-200" : "text-slate-400"
                            }`}
                          >
                            <span>{m.time}</span>
                            {isAgent && (
                              <span title={`Status: ${m.status || "sent"}`}>
                                {m.status === "failed" ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                                ) : m.status === "read" ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                ) : m.status === "delivered" ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-indigo-200" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {m.status === "failed" && m.errorMessage && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{m.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer & Input Error Banner */}
              <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0c1220]">
                {sendError && (
                  <div className="mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">{sendError}</div>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* No conversation selected placeholder */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Select a Conversation
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose a customer from the left list to view their live WhatsApp thread, or start a new conversation.
              </p>
            </div>
          )}
        </div>

        {/* Right Pane: Contact Info Sidebar matching image.png */}
        {activeConv && showContactInfo && (
          <div className="hidden xl:flex w-72 lg:w-80 border-l border-slate-200/80 dark:border-slate-800/80 flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 p-5 overflow-y-auto space-y-5 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contact Info
              </span>
              <button
                onClick={() => setShowContactInfo(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Close Sidebar"
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar & Details */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-900 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
                {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {activeConv.name}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {activeConv.phone}
                </p>
              </div>
            </div>

            {/* Quick Action Icons matching image.png */}
            <div className="flex items-center justify-center gap-3 py-1">
              <button
                type="button"
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer"
                title="Message"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
              </button>
              <a
                href={`tel:${activeConv.rawPhone}`}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer"
                title="Call"
              >
                <Phone className="w-4 h-4 text-blue-600" />
              </a>
            </div>

            {/* Tags matching image.png */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  New Lead
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Pricing Inquiry
                </span>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  + Add Tag
                </button>
              </div>
            </div>

            {/* Notes Section matching image.png */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Notes
              </span>
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Assigned To matching image.png */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned To
              </span>
              <select
                value={assignedAgent}
                onChange={(e) => setAssignedAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Orion Edmund">Orion Edmund</option>
                <option value="Support Team">Support Team</option>
                <option value="Sales Agent">Sales Agent</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Start WhatsApp Conversation
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChat(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              To initiate a business conversation outside an active 24h customer window, Meta requires dispatching an approved HSM template ping.
            </p>

            {newChatError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{newChatError}</span>
              </div>
            )}

            <form onSubmit={handleStartNewChat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  value={newChatNumber}
                  onChange={(e) => setNewChatNumber(e.target.value)}
                  placeholder="e.g. +14155550192 or +919876543210"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStartingChat || !newChatNumber.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  {isStartingChat ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending HSM Ping...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Initiate Chat
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading Live Inbox...</span>
          </div>
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
