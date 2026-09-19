"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Phone,
  Check,
} from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  tags: string[];
}

interface ChatMessage {
  id: string;
  sender: "customer" | "agent";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

const initialConversations: Conversation[] = [
  {
    id: "c1",
    name: "Sarah Jenkins",
    phone: "+1 415-555-0192",
    lastMessage: "Hi, can I change my delivery address for order #4819?",
    time: "10:42 AM",
    unread: 1,
    tags: ["Order Support", "VIP"],
  },
  {
    id: "c2",
    name: "Carlos Gomez",
    phone: "+34 612 345 678",
    lastMessage: "Thank you for the quick confirmation!",
    time: "10:15 AM",
    unread: 0,
    tags: ["Product Inquiry"],
  },
  {
    id: "c3",
    name: "Amina Al-Sayed",
    phone: "+971 50 123 4567",
    lastMessage: "Do you offer international shipping to Dubai?",
    time: "09:50 AM",
    unread: 2,
    tags: ["Pre-Sales"],
  },
  {
    id: "c4",
    name: "Liam O'Connor",
    phone: "+44 7700 900123",
    lastMessage: "Where can I track my package?",
    time: "Yesterday",
    unread: 0,
    tags: ["Tracking"],
  },
];

const chatThreads: Record<string, ChatMessage[]> = {
  c1: [
    { id: "m1", sender: "customer", text: "Hello! I placed order #4819 twenty minutes ago.", time: "10:40 AM" },
    { id: "m2", sender: "customer", text: "Hi, can I change my delivery address for order #4819?", time: "10:42 AM" },
  ],
  c2: [
    { id: "m3", sender: "agent", text: "Your reservation for table #4 has been confirmed for 7:30 PM tonight!", time: "10:10 AM", status: "read" },
    { id: "m4", sender: "customer", text: "Thank you for the quick confirmation!", time: "10:15 AM" },
  ],
  c3: [
    { id: "m5", sender: "customer", text: "Hello team, I found your catalog on Instagram.", time: "09:48 AM" },
    { id: "m6", sender: "customer", text: "Do you offer international shipping to Dubai?", time: "09:50 AM" },
  ],
  c4: [
    { id: "m7", sender: "customer", text: "Where can I track my package?", time: "Yesterday" },
    { id: "m8", sender: "agent", text: "You can track your package using tracking ID #WF-9941 at tracking.wafilow.com", time: "Yesterday", status: "read" },
  ],
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string>("c1");
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(chatThreads);
  const [inputText, setInputText] = useState("");

  const activeConv = conversations.find((c) => c.id === selectedId) || conversations[0];
  const activeMessages = messages[selectedId] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: "agent",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), newMsg],
    }));

    // update conversation last message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, lastMessage: inputText.trim(), time: "Just now", unread: 0 }
          : c
      )
    );

    setInputText("");

    // simulate delivered & read ticks
    setTimeout(() => {
      setMessages((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] || []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "read" } : m
        ),
      }));
    }, 1200);
  };

  return (
    <AppLayout
      title="Live WhatsApp Inbox"
      subtitle="Omnichannel two-way WhatsApp Business messaging with real-time status"
    >
      <div className="h-[calc(100vh-220px)] min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left: Conversation List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chats or numbers..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {conversations.map((c) => {
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setConversations((prev) =>
                      prev.map((item) => (item.id === c.id ? { ...item, unread: 0 } : item))
                    );
                  }}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600"
                      : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center flex-shrink-0 text-sm">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{c.time}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.lastMessage}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {c.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                      {c.unread > 0 && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/20 dark:bg-slate-950/20">
          {/* Chat Header */}
          <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-sm">
                {activeConv.name[0]}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{activeConv.name}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {activeConv.phone}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3 h-3" /> 24h Window Open
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {activeMessages.map((m) => {
              const isAgent = m.sender === "agent";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-md p-3 rounded-2xl text-xs sm:text-sm shadow-sm ${
                      isAgent
                        ? "bg-emerald-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-none"
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                        isAgent ? "text-emerald-200" : "text-slate-400"
                      }`}
                    >
                      <span>{m.time}</span>
                      {isAgent && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 ${
                            m.status === "read" ? "text-sky-300" : "text-emerald-200"
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
          >
            <button
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your WhatsApp reply..."
              className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
