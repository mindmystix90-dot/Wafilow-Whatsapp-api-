"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
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
  Info,
  X,
  ExternalLink,
  RotateCcw,
  Beaker,
  ShieldCheck,
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
  lastInboundAt?: string | null;
  isWindowOpen?: boolean;
  windowExpiresAt?: string | null;
  remainingHours?: number;
  remainingMinutes?: number;
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
  errorCode?: number;
  errorType?: "phone_registration_required" | "registration" | "window_closed" | "token_expired" | "undeliverable" | "permission" | "general";
}

interface CustomerWindowInfo {
  isOpen: boolean;
  remainingHours: number;
  remainingMinutes: number;
  expiresAt?: string | null;
}

interface ErrorDetailsModalState {
  open: boolean;
  messageText: string;
  errorMessage: string;
  errorCode?: number;
  errorType?: string;
  phone?: string;
}

function createOptimisticMessage(text: string): ChatMessage {
  return {
    id: `temp_${Date.now()}`,
    sender: "agent",
    text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: "sent",
  };
}

function InboxContent() {
  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get("contactId");
  const envParam = searchParams.get("environment");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(contactIdParam || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "assigned" | "starred" | "archived">("all");
  const [environment, setEnvironment] = useState<"production" | "sandbox">(
    envParam === "sandbox" ? "sandbox" : "production"
  );

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customerWindow, setCustomerWindow] = useState<CustomerWindowInfo | null>(null);

  // Connection notice banner state
  const [connectionNotice, setConnectionNotice] = useState<{
    type: "registration" | "window_closed" | "token_expired" | "permission" | "general";
    title: string;
    description: string;
    actionLink?: string;
    actionLabel?: string;
    actionType?: "register" | "send_template";
  } | null>(null);

  // Detailed error modal for administrators
  const [errorModal, setErrorModal] = useState<ErrorDetailsModalState>({
    open: false,
    messageText: "",
    errorMessage: "",
  });

  // Mobile contact info drawer
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);

  // Desktop contact info panel
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [assignedAgent, setAssignedAgent] = useState("Support Agent");
  const [contactNotes, setContactNotes] = useState("Inquiry via WhatsApp Business Platform.");

  // New Chat modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatNumber, setNewChatNumber] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Smart scroll handling: only auto-scroll if near bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // User is considered near bottom if within 120px of the bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  const scrollToBottom = (force = false) => {
    if (!messagesContainerRef.current) return;
    if (force || isNearBottomRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Adjust textarea height automatically up to 120px
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // 1. Fetch Conversations from Database for current environment
  const fetchConversations = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations?environment=${environment}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations || []);
          if (isInitial && data.conversations?.length > 0) {
            // On desktop, auto-select first conversation
            if (typeof window !== "undefined" && window.innerWidth >= 768) {
              setSelectedId((curr) => curr || data.conversations[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      if (isInitial) setIsLoadingConversations(false);
    }
  }, [environment]);

  // 2. Fetch Messages for Selected Conversation in current environment
  const fetchMessages = useCallback(async (contactId: string, isInitial = false) => {
    try {
      const res = await fetch(
        `/api/whatsapp/messages?contactId=${encodeURIComponent(contactId)}&environment=${environment}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
          if (data.customerWindow) {
            setCustomerWindow(data.customerWindow);
          }
          if (isInitial) {
            // Force scroll to bottom on initial load
            setTimeout(() => scrollToBottom(true), 50);
          } else {
            scrollToBottom(false);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (isInitial) setIsLoadingMessages(false);
    }
  }, [environment]);

  // Initial load or environment change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchConversations]);

  // Load messages when selectedId or environment changes
  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      setConnectionNotice(null);
      setCustomerWindow(null);
      setIsLoadingMessages(true);
      fetchMessages(selectedId, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedId, fetchMessages]);

  // Derive authoritative active window: uses detailed messages window, or falls back to conversation summary
  const activeConv = conversations.find((c) => c.id === selectedId);
  const activeWindow: CustomerWindowInfo | null =
    customerWindow ||
    (activeConv && activeConv.isWindowOpen !== undefined
      ? {
          isOpen: Boolean(activeConv.isWindowOpen),
          remainingHours: activeConv.remainingHours || 0,
          remainingMinutes: activeConv.remainingMinutes || 0,
          expiresAt: activeConv.windowExpiresAt,
        }
      : null);

  // Poll for live messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false);
      if (selectedId) {
        fetchMessages(selectedId, false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedId, fetchConversations, fetchMessages]);

  // Helper to diagnose and surface connection-level errors cleanly
  const processErrorNotice = (errorCode?: number, errorType?: string) => {
    if (
      errorCode === 133010 ||
      errorType === "phone_registration_required" ||
      errorType === "registration"
    ) {
      setConnectionNotice({
        type: "registration",
        title: "Phone Number Registration Required",
        description:
          "Meta reports that this WhatsApp phone number is not registered on WhatsApp Business Platform. Complete your 6-digit two-step verification PIN registration in Settings to enable messaging.",
        actionLink: "/settings?tab=production&action=register",
        actionLabel: "Register PIN in Settings",
        actionType: "register",
      });
    } else if (
      errorCode === 131047 ||
      errorCode === 131030 ||
      errorType === "window_closed"
    ) {
      setConnectionNotice({
        type: "window_closed",
        title: "24-Hour Customer Window Expired",
        description:
          "More than 24 hours have passed since the customer's last reply. Outside this window, Meta policy requires sending an approved Template (e.g. 'hello_world') to re-open the conversation.",
        actionType: "send_template",
        actionLabel: "Send 'hello_world' Template",
      });
    } else if (errorCode === 190 || errorType === "token_expired") {
      setConnectionNotice({
        type: "token_expired",
        title: "Meta Access Token Expired",
        description:
          "Your Meta System User Access Token has expired or been invalidated. Update your permanent access token in Settings.",
        actionLink: "/settings",
        actionLabel: "Update Access Token",
      });
    } else if (errorCode === 200 || errorCode === 10 || errorType === "permission") {
      setConnectionNotice({
        type: "permission",
        title: "WhatsApp Permissions Required",
        description:
          "Your Meta token is missing required messaging permissions ('whatsapp_business_messaging'). Review permissions in Meta Business Suite.",
        actionLink: "/settings",
        actionLabel: "Review Credentials",
      });
    }
  };

  // Dispatch approved Template message (re-opens customer service window)
  const handleSendTemplate = async (templateName = "hello_world") => {
    if (!selectedId || isSending) return;

    setIsSending(true);

    const optimisticMsg = createOptimisticMessage(`Template: ${templateName}`);
    optimisticMsg.type = "template";
    const tempId = optimisticMsg.id;

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedId,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en_US" },
          },
          environment,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        processErrorNotice(data.errorCode, data.errorType);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: "failed",
                  errorMessage: data.error || "Delivery failed",
                  errorCode: data.errorCode,
                  errorType: data.errorType,
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...data.message } : m))
        );
        setConnectionNotice(null);
        fetchConversations(false);
        if (selectedId) fetchMessages(selectedId, false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
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

  // 3. Send Message via Real Meta Cloud API
  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText ?? inputText).trim();
    if (!textToSend || !selectedId || isSending) return;

    // Block free-form text if 24-hour window has expired
    if (activeWindow && !activeWindow.isOpen) {
      processErrorNotice(131047, "window_closed");
      return;
    }

    setIsSending(true);

    // Optimistic message bubble
    const optimisticMsg = createOptimisticMessage(textToSend);
    const tempId = optimisticMsg.id;

    setMessages((prev) => [...prev, optimisticMsg]);
    if (!overrideText) {
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }

    setTimeout(() => scrollToBottom(true), 30);

    try {
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedId,
          type: "text",
          text: textToSend,
          environment,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        processErrorNotice(data.errorCode, data.errorType);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  status: "failed",
                  errorMessage: data.error || "Delivery failed",
                  errorCode: data.errorCode,
                  errorType: data.errorType,
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

  // Safe intelligent retry for failed messages - NEVER blindly retries permanent failures
  const handleRetry = (msgText: string, failedMsgId: string, errorCode?: number, errorType?: string) => {
    if (errorCode === 131047 || errorCode === 131030 || errorType === "window_closed") {
      // The 24h window is closed - sending text will fail again; send an approved template instead!
      setMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
      handleSendTemplate("hello_world");
      return;
    }

    if (
      errorCode === 133010 ||
      errorType === "phone_registration_required" ||
      errorType === "registration"
    ) {
      // Phone is unregistered - retrying text will fail; route to PIN registration
      processErrorNotice(133010, "phone_registration_required");
      return;
    }

    // Remove the failed placeholder and retry cleanly for transient network errors
    setMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
    handleSendMessage(undefined, msgText);
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
          environment,
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
      subtitle="Real-time multi-agent conversation management via Meta WhatsApp Cloud API"
      hideMobileBottomNav={Boolean(selectedId)}
      hideMobileHeader={Boolean(selectedId)}
      noMainPadding={Boolean(selectedId)}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchConversations(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shadow-xs cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      }
    >
      {/* 
        Responsive Container:
        - Mobile with active conversation: Full viewport height (100dvh), 0 margins
        - Desktop: Elegant card with borders and calc height
      */}
      <div
        className={`w-full ${
          selectedId
            ? "h-[100dvh] md:h-[calc(100vh-210px)] md:min-h-[580px]"
            : "h-[calc(100vh-140px)] md:h-[calc(100vh-210px)] md:min-h-[580px]"
        } md:border md:border-slate-200/80 md:dark:border-slate-800/80 md:rounded-2xl bg-white dark:bg-[#0b0f19] md:shadow-sm overflow-hidden flex flex-col md:flex-row`}
      >
        {/* ===================== LEFT PANE: CONVERSATION LIST ===================== */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-full bg-slate-50/50 dark:bg-[#0e1424] ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Mobile Header when in List View */}
          <div className="md:hidden p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#5938F5] text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                W
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                WhatsApp Chats
              </h2>
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl bg-[#5938F5] text-white text-xs font-semibold shadow-xs flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {/* Search & Tabs */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] space-y-2.5">
            {/* Environment Selector Segmented Control */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  if (environment !== "production") {
                    setEnvironment("production");
                    setSelectedId(null);
                    setMessages([]);
                  }
                }}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                  environment === "production"
                    ? "bg-white dark:bg-[#111827] text-[#5938F5] dark:text-violet-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Production</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (environment !== "sandbox") {
                    setEnvironment("sandbox");
                    setSelectedId(null);
                    setMessages([]);
                  }
                }}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                  environment === "sandbox"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Beaker className="w-3.5 h-3.5" />
                <span>Sandbox Test</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-[#5938F5] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "unread"
                    ? "bg-[#5938F5] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                Unread ({conversations.filter((c) => c.unread > 0).length})
              </button>
              <button
                onClick={() => setActiveTab("starred")}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "starred"
                    ? "bg-[#5938F5] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                Starred
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats by name or phone..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5]"
              />
            </div>
          </div>

          {/* Conversation items list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-[#5938F5] mb-2" />
                <span className="text-xs">Loading WhatsApp chats...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  No Conversations
                </div>
                <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
                  Incoming WhatsApp messages or outbound template pings will appear here.
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-2 py-2 px-4 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Start New Chat
                </button>
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
                        ? "bg-slate-100/90 dark:bg-[#1a233b] border-l-4 border-[#5938F5]"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-[#5938F5] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {c.name ? c.name[0]?.toUpperCase() : "W"}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0e1424] absolute bottom-0 right-0" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm truncate text-slate-900 dark:text-white">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium ml-2">
                          {c.time}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                        {c.lastMessageDirection === "outbound" && (
                          <span className="text-[10px] text-[#5938F5] font-semibold">You:</span>
                        )}
                        <span className="truncate">{c.lastMessage}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {c.phone}
                        </span>
                        {c.unread > 0 && (
                          <span className="min-w-4 h-4 px-1 rounded-full bg-[#5938F5] text-white text-[10px] font-bold flex items-center justify-center">
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

        {/* ===================== CENTER PANE: ACTIVE CHAT CONVERSATION ===================== */}
        <div
          className={`flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] ${
            !selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* 1. WHATSAPP FIXED CHAT HEADER */}
              <div className="h-14 sm:h-16 px-3 sm:px-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] flex items-center justify-between shrink-0 z-10 shadow-xs">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Mobile Back Button (Returns to chat list) */}
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Back to conversations"
                    className="md:hidden p-2 -ml-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Contact Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-[#5938F5] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
                    </div>
                    <span
                      title="Cloud API Active"
                      className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111827] absolute bottom-0 right-0"
                    />
                  </div>

                  {/* Contact Name & Phone (with overflow handling) */}
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-xs">
                      {activeConv.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono leading-none mt-0.5 flex-wrap">
                      <span className="truncate">{activeConv.phone}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-semibold">
                        • WhatsApp
                      </span>
                      {activeWindow ? (
                        activeWindow.isOpen ? (
                          <span
                            title={`Customer Care Window open. Free-form text allowed for ${activeWindow.remainingHours}h ${activeWindow.remainingMinutes}m.`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>24h Window: Open ({activeWindow.remainingHours}h {activeWindow.remainingMinutes}m left)</span>
                          </span>
                        ) : (
                          <span
                            title="More than 24h have passed since customer's last reply. Meta policy requires approved Templates only."
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>24h Window: Closed (Template Required)</span>
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right Action Icons (Supported call & info triggers) */}
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${activeConv.rawPhone}`}
                    aria-label="Call Contact"
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.innerWidth < 1280) {
                        setMobileInfoOpen(true);
                      } else {
                        setShowContactInfo(!showContactInfo);
                      }
                    }}
                    aria-label="Contact Information"
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Environment Banner */}
              {environment === "sandbox" ? (
                <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Beaker className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">
                      <strong>SANDBOX TEST MODE:</strong> Using Meta Developer test phone number. Real production customers will not receive these messages.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase shrink-0">
                    Sandbox
                  </span>
                </div>
              ) : (
                <div className="px-3.5 py-1 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] flex items-center justify-between shrink-0">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <strong>PRODUCTION MODE:</strong> Real customer WhatsApp business channel
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    LIVE
                  </span>
                </div>
              )}

              {/* Dismissible Connection Notice Banner (For 133010, 131047, 131030, etc.) */}
              {connectionNotice && (
                <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="truncate">
                      <strong className="font-semibold">{connectionNotice.title}:</strong>{" "}
                      <span className="text-[11px]">{connectionNotice.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {connectionNotice.actionType === "send_template" ? (
                      <button
                        type="button"
                        onClick={() => handleSendTemplate("hello_world")}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-[#5938F5] hover:bg-[#4d2ee0] text-white font-semibold text-[10px] whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                      >
                        {isSending ? "Sending..." : connectionNotice.actionLabel || "Send Template"}
                      </button>
                    ) : connectionNotice.actionLink ? (
                      <Link
                        href={connectionNotice.actionLink}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] whitespace-nowrap transition-colors"
                      >
                        {connectionNotice.actionLabel || "Resolve"}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setConnectionNotice(null)}
                      className="p-1 rounded-md text-amber-700 hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. MESSAGE HISTORY (WHATSAPP CONVERSATION LAYOUT) */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
              >
                {isLoadingMessages ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#5938F5]" />
                    <span className="text-xs text-slate-400 mt-2">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 mx-auto flex items-center justify-center text-slate-400 shadow-xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No messages recorded yet
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Send a message below to start chatting via Meta WhatsApp Cloud API.
                    </p>
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
                        {/* Bubble Container */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                            isAgent
                              ? isFailed
                                ? "bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-900 text-slate-900 dark:text-white rounded-tr-xs"
                                : "bg-[#5938F5] text-white rounded-tr-xs"
                              : "bg-white dark:bg-[#182236] border border-slate-200/70 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>

                          {/* Bubble Footer: Timestamp & Delivery State Ticks */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                              isAgent
                                ? isFailed
                                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                                  : "text-white/80"
                                : "text-slate-400"
                            }`}
                          >
                            <span>{m.time}</span>

                            {isAgent && (
                              <span className="inline-flex items-center ml-0.5">
                                {isFailed ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                ) : m.status === "read" ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                ) : m.status === "delivered" ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtle Failed Message State & Intelligent Action */}
                        {isFailed && (
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium flex-wrap">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Not delivered
                            </span>
                            {m.errorCode === 131047 || m.errorCode === 131030 || m.errorType === "window_closed" ? (
                              <button
                                type="button"
                                onClick={() => handleRetry(m.text, m.id, m.errorCode, m.errorType)}
                                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Send className="w-3 h-3" />
                                Send Template
                              </button>
                            ) : m.errorCode === 133010 || m.errorType === "phone_registration_required" || m.errorType === "registration" ? (
                              <Link
                                href="/settings?tab=production&action=register"
                                className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Register PIN
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRetry(m.text, m.id, m.errorCode, m.errorType)}
                                className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Retry
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setErrorModal({
                                  open: true,
                                  messageText: m.text,
                                  errorMessage: m.errorMessage || "Meta rejected the outbound message dispatch.",
                                  errorCode: m.errorCode,
                                  errorType: m.errorType,
                                  phone: activeConv.phone,
                                })
                              }
                              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[10px] underline cursor-pointer"
                            >
                              View details
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 3. FIXED MESSAGE COMPOSER */}
              <div className="p-2.5 sm:p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111827] shrink-0 sticky bottom-0 z-20 pb-safe">
                {/* 24-Hour Window Expired Notice with Template Quick Action */}
                {activeWindow && !activeWindow.isOpen && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 max-w-4xl mx-auto flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-[11px] leading-relaxed">
                        <strong>24h Window Expired:</strong> Free-form text is blocked by Meta. Send an approved template message to re-open the conversation.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendTemplate("hello_world")}
                      disabled={isSending}
                      className="px-3 py-1.5 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white font-semibold text-xs shrink-0 shadow-xs cursor-pointer transition-colors"
                    >
                      {isSending ? "Sending..." : "Send 'hello_world' Template"}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] px-1 pb-2 max-w-4xl mx-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Environment:</span>
                    {environment === "sandbox" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-500 text-white tracking-wide uppercase shadow-xs">
                        <Beaker className="w-3 h-3" />
                        SANDBOX
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-[#5938F5] text-white tracking-wide uppercase shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        PRODUCTION
                      </span>
                    )}
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
                      {environment === "sandbox"
                        ? "• Sending via Meta Sandbox Test Number (Safe testing)"
                        : "• Sending via Verified Business Number (Live customer)"}
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    className="text-[#5938F5] dark:text-violet-400 hover:underline text-[11px] font-medium shrink-0 ml-2"
                  >
                    Manage Connections
                  </Link>
                </div>
                <form
                  onSubmit={(e) => handleSendMessage(e)}
                  className="flex items-end gap-2 max-w-4xl mx-auto"
                >
                  <div className="flex-1 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 flex items-center focus-within:ring-2 focus-within:ring-[#5938F5]/20 focus-within:border-[#5938F5] transition-all">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={handleTextareaChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={
                        activeWindow && !activeWindow.isOpen
                          ? "Customer window expired. Use 'Send Template' button above to re-open..."
                          : "Type a message..."
                      }
                      disabled={isSending || (activeWindow !== null && !activeWindow.isOpen)}
                      className="w-full text-xs sm:text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending || (activeWindow !== null && !activeWindow.isOpen)}
                    aria-label="Send WhatsApp message"
                    className="w-11 h-11 rounded-full bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-40 text-white font-semibold shadow-sm transition-all flex items-center justify-center shrink-0 cursor-pointer"
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
            /* No conversation selected placeholder (Desktop) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-400 shadow-xs">
                <MessageSquare className="w-7 h-7 text-[#5938F5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Select a WhatsApp Chat
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Choose a customer from the left list to review their live WhatsApp thread, or initiate a new business template.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>

        {/* ===================== DESKTOP CONTACT INFO SIDEBAR ===================== */}
        {activeConv && showContactInfo && (
          <div className="hidden xl:flex w-72 lg:w-80 border-l border-slate-200/80 dark:border-slate-800/80 flex-col h-full bg-slate-50/50 dark:bg-[#0e1424] p-5 overflow-y-auto space-y-5 shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Contact Details
              </span>
              <button
                type="button"
                onClick={() => setShowContactInfo(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Hide Panel"
              >
                ✕
              </button>
            </div>

            {/* Profile Avatar & Details */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-[#5938F5] text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {activeConv.name}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeConv.phone}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-3 py-1">
              <a
                href={`tel:${activeConv.rawPhone}`}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs font-semibold shadow-xs hover:bg-slate-50 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#5938F5]" />
                <span>Call Phone</span>
              </a>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Tags & Segments
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  Active WhatsApp
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                  Cloud API v24.0
                </span>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Workspace Notes
              </span>
              <textarea
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#5938F5] resize-none"
              />
            </div>

            {/* Assigned Agent */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Assigned Seat
              </span>
              <select
                value={assignedAgent}
                onChange={(e) => setAssignedAgent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#5938F5]"
              >
                <option value="Support Agent">Support Agent</option>
                <option value="Workspace Admin">Workspace Admin</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ===================== MOBILE CONTACT INFO MODAL ===================== */}
      {mobileInfoOpen && activeConv && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Contact Info</h3>
              <button
                type="button"
                onClick={() => setMobileInfoOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-[#5938F5] text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                {activeConv.name ? activeConv.name[0]?.toUpperCase() : "W"}
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {activeConv.name}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {activeConv.phone}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <a
                href={`tel:${activeConv.rawPhone}`}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-200"
              >
                <Phone className="w-4 h-4 text-[#5938F5]" />
                <span>Call {activeConv.phone}</span>
              </a>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                WhatsApp Channel
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                Connected via Meta WhatsApp Cloud API v24.0. Supports text messages, templates, and webhook delivery status.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== ADMINISTRATOR ERROR DETAILS MODAL ===================== */}
      {errorModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Message Delivery Diagnostics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setErrorModal({ open: false, messageText: "", errorMessage: "" })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1 font-mono">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Message Content</div>
                <div className="text-slate-800 dark:text-slate-200 text-xs italic">
                  &quot;{errorModal.messageText}&quot;
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <span>Meta Cloud API Diagnosis:</span>
                </div>
                <p className="leading-relaxed text-[11px] font-sans">
                  {errorModal.errorMessage}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Recommended Action
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {errorModal.errorCode === 133010 || errorModal.errorType === "phone_registration_required" || errorModal.errorType === "registration"
                    ? "The phone number is not registered on WhatsApp Business Platform. Complete the 6-digit two-step verification PIN registration in Settings to enable messaging."
                    : errorModal.errorCode === 131047 || errorModal.errorCode === 131030 || errorModal.errorType === "window_closed"
                    ? "Customer 24h service window has expired. Outside this window, Meta policy requires sending an approved Template message (e.g. 'hello_world') to re-engage with the customer."
                    : errorModal.errorCode === 190
                    ? "Meta Access Token has expired. Regenerate your token in Meta Business Manager and update Settings."
                    : "Check your WhatsApp API connection in Settings and verify your Meta Business Portfolio status."}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link
                href="/settings"
                className="px-4 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <span>Check WhatsApp Connection</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setErrorModal({ open: false, messageText: "", errorMessage: "" })}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== NEW CHAT MODAL ===================== */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
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

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5938F5]/20 focus:border-[#5938F5] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChat(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStartingChat || !newChatNumber.trim()}
                  className="px-4 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
            <Loader2 className="w-5 h-5 animate-spin text-[#5938F5]" />
            <span className="text-sm font-medium">Loading Live Inbox...</span>
          </div>
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}
