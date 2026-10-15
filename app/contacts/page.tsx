"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Search, UserPlus, Loader2, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  optIn: boolean;
  updatedAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newTags, setNewTags] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContacts(data.contacts || []);
        }
      }
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/contacts");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success) {
            setContacts(data.contacts || []);
          }
        }
      } catch (err) {
        console.error("Error loading contacts:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          tags: newTags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddError(data.error || "Failed to add contact");
      } else {
        setShowAddModal(false);
        setNewName("");
        setNewPhone("");
        setNewTags("");
        fetchContacts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <AppLayout
      title="Contacts"
      subtitle="Manage your customers and segments."
      action={
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contact..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-xs"
            />
          </div>
        </div>

        {/* Contacts Table matching image.png */}
        <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-[#0c1220] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <span className="text-xs">Loading contacts...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400">
                <UserPlus className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                No Contacts Found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Contacts will automatically be registered when customers message your WhatsApp number, or you can create one manually.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add First Contact
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Phone</th>
                    <th className="py-3 px-5">Tags</th>
                    <th className="py-3 px-5">Added</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-900 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {c.name ? c.name[0]?.toUpperCase() : "W"}
                          </div>
                          <span className="font-bold text-slate-950 dark:text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-slate-600 dark:text-slate-400">{c.phone}</td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.tags.map((t, idx) => {
                            const isNew = t.toLowerCase().includes("new") || t.toLowerCase().includes("lead");
                            const isWarm = t.toLowerCase().includes("warm") || t.toLowerCase().includes("interested");
                            return (
                              <span
                                key={idx}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isNew
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : isWarm
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                }`}
                              >
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-400">
                        {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recently"}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          href={`/inbox?contactId=${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          Chat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Add WhatsApp Contact
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Register a contact with their international phone number.
            </p>

            <form onSubmit={handleAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +14155550192"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="VIP, Lead, Support"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {addError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError(null);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 rounded-xl bg-[#5938F5] hover:bg-[#4d2ee0] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {isAdding ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
