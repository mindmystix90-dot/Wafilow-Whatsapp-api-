"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

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

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    if (isInitial) setIsLoadingConversations(true);
    try {
      const res = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations || []);
          if (isInitial && data.conversations?.length > 0) {
            setSelectedId((prev) => prev || data.conversations[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      if (isInitial) setIsLoadingConversations(false);
    }
  }, []);

  // 2. Fetch Messages for Selected Conversation
  const fetchMessages = useCallback(async (contactId: string, isInitial = false) => {
    if (isInitial) setIsLoadingMessages(true);
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
    async function load() {
      setIsLoadingConversations(true);
      try {
        const res = await fetch("/api/whatsapp/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success) {
            setConversations(data.conversations || []);
            if (data.conversations?.length > 0) {
              setSelectedId((prev) => prev || data.conversations[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        if (!ignore) setIsLoadingConversations(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Load messages whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      return;
    }
    let ignore = false;
    fetch(`/api/whatsapp/messages?contactId=${encodeURIComponent(selectedId)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setMessages(data.messages || []);
        }
      })
      .catch((err) => console.error("Error fetching messages:", err));

    return () => {
      ignore = true;
    };
  }, [selectedId]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh poll every 4 seconds to capture live Meta webhooks (inbound messages & delivery ticks)
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

    // Optimistic placeholder (marked pending)
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
        // Meta rejected the message - DO NOT MARK SUCCESSFUL
        setSendError(data.error || "Meta WhatsApp Cloud API rejected the message.");

        // Update optimistic bubble to failed state with exact error message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: "failed",
                  errorMessage: data.error || "Meta Cloud API delivery failed",
                }
              : m
          )
        );
      } else {
        // Meta accepted the message: replace temp message with verified DB message
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

  // Start a new chat with any valid phone number
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

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <AppLayout
      title="Live WhatsApp Inbox"
      subtitle="Real-time two-way messaging directly connected to Meta Cloud API v24.0"
    >
      <div className="h-[calc(100vh-220px)] min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats or phone numbers..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              title="Start New WhatsApp Chat"
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchConversations(false)}
              title="Refresh Inbox"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs">Loading real conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              /* Empty State for Conversation List */
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                  No Conversations Yet
                </h4>
                <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed mb-4">
                  Incoming WhatsApp messages from your webhook or outbound test pings will appear here.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Chat
                  </button>
                  <Link
                    href="/settings"
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5"
                  >
                    Send Test Ping <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600"
                        : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center flex-shrink-0 text-sm">
                      {c.name ? c.name[0]?.toUpperCase() : "W"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{c.time}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        {c.lastMessageDirection === "outbound" && (
                          <span className="text-[10px] text-slate-400 font-medium">You:</span>
                        )}
                        <span className="truncate">{c.lastMessage}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {c.tags.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/20 dark:bg-slate-950/20">
          {!activeConv ? (
            /* Polished Empty State when no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-900/60 shadow-sm">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                WhatsApp Live Inbox
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
                Select an active conversation from the list to view incoming customer messages and send verified WhatsApp replies through Meta Cloud API.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Start New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-sm">
                    {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {activeConv.name}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {activeConv.phone}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3" /> Meta Cloud API Active
                  </span>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mr-2" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <span>No messages in this conversation yet. Send the first reply below.</span>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAgent = m.sender === "agent";
                    const isFailed = m.status === "failed";

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md p-3 rounded-2xl text-xs sm:text-sm shadow-sm ${
                            isFailed
                              ? "bg-red-50 dark:bg-red-950/70 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-br-none"
                              : isAgent
                              ? "bg-emerald-600 text-white rounded-br-none"
                              : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-none"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                          {/* Error description if Meta rejected the message */}
                          {isFailed && m.errorMessage && (
                            <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1">
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span className="leading-tight">{m.errorMessage}</span>
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isFailed
                                ? "text-red-600 dark:text-red-400"
                                : isAgent
                                ? "text-emerald-200"
                                : "text-slate-400"
                            }`}
                          >
                            <span>{m.time}</span>
                            {isAgent && (
                              <span>
                                {isFailed ? (
                                  <span className="font-semibold text-red-600 dark:text-red-400">Failed</span>
                                ) : m.status === "read" ? (
                                  <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-sky-300" /></span>
                                ) : m.status === "delivered" ? (
                                  <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-emerald-200" /></span>
                                ) : (
                                  <span title="Sent to Meta"><Check className="w-3.5 h-3.5 text-emerald-300" /></span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Error Alert */}
              {sendError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/80 border-t border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <strong className="font-semibold block">Message Not Delivered by Meta:</strong>
                    <span className="leading-relaxed">{sendError}</span>
                  </div>
                </div>
              )}

              {/* Chat Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  disabled={isSending}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a real WhatsApp message to send via Meta Cloud API..."
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Start WhatsApp Conversation
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter an international phone number. A verified <code className="font-mono">hello_world</code> template ping will initiate the thread via Meta Cloud API.
            </p>

            <form onSubmit={handleStartNewChat} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recipient Phone Number (E.164 with Country Code)
                </label>
                <input
                  type="text"
                  required
                  value={newChatNumber}
                  onChange={(e) => setNewChatNumber(e.target.value)}
                  placeholder="e.g. +14155550192 or 447700900123"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              {newChatError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{newChatError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChat(false);
                    setNewChatError(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStartingChat}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isStartingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isStartingChat ? "Initiating..." : "Initiate Chat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
