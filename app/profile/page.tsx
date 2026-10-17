"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import AppLayout from "@/components/AppLayout";
import {
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  User as UserIcon,
  Mail,
  Building,
  Sparkles,
} from "lucide-react";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  organizationId: string | null;
  organizationName: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status feedback
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.success && data.user) {
            setProfile(data.user);
            setDisplayName(data.user.name || "");
          }
        }
      } catch {
        if (!ignore && session?.user) {
          setProfile({
            id: session.user.id || "",
            name: session.user.name || "",
            email: session.user.email || "",
            image: session.user.image || null,
            role: session.user.role || "user",
            organizationId: session.user.organizationId || null,
            organizationName: "Wafilow Workspace",
          });
          setDisplayName(session.user.name || "");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [session]);

  // Handle local file selection and preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage("Selected image is too large. Maximum allowed file size is 3MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid image format. Supported formats: JPEG, PNG, WebP, GIF.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Upload photo
  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploadingPhoto(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload profile photo.");
      }

      const newAvatarUrl = data.avatarUrl;
      setProfile((prev) => (prev ? { ...prev, image: newAvatarUrl } : null));
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Sync with NextAuth session in memory
      await updateSession({ image: newAvatarUrl });

      setSuccessMessage("Wafilow profile photo updated successfully!");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error uploading profile photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Cancel preview
  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove photo
  const handleRemovePhoto = async () => {
    setIsRemovingPhoto(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove profile photo.");
      }

      setProfile((prev) => (prev ? { ...prev, image: null } : null));
      setPreviewUrl(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Sync with NextAuth session in memory
      await updateSession({ image: null });

      setSuccessMessage("Wafilow profile photo removed.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error removing photo.");
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  // Save display name
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage("Display name cannot be empty.");
      return;
    }

    setIsSavingName(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile name.");
      }

      setProfile((prev) => (prev ? { ...prev, name: displayName.trim() } : null));
      await updateSession({ name: displayName.trim() });
      setSuccessMessage("Display name updated successfully.");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error updating display name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const currentImage = previewUrl || profile?.image || session?.user?.image;
  const initials = (profile?.name || session?.user?.name || profile?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <AppLayout
      title="User Profile"
      subtitle="Manage your personal Wafilow CRM account details, avatar photo, and workspace identity."
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="ml-2 text-xs font-medium">Loading profile...</span>
          </div>
        )}

        {/* Status Alerts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 font-semibold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 dark:text-rose-300 font-semibold text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Feature Clarification & Isolation Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white dark:bg-[#0c1220] border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Wafilow Personal Account Photo</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  CRM Internal Only
                </span>
              </div>
              <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 leading-relaxed max-w-2xl">
                This profile photo is strictly for your personal Wafilow CRM account interface (navigation sidebar, comments, team dashboard). It is completely separate from Meta and is <strong>never transmitted to WhatsApp Business or Meta accounts</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ===================== CARD 1: PROFILE PHOTO ===================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Profile Photo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload a personalized avatar to represent you across the Wafilow workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Display */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-md border-2 border-slate-200 dark:border-slate-700">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={profile?.name || "User Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              {previewUrl && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-sm animate-pulse">
                  Preview
                </span>
              )}
            </div>

            {/* Upload Controls & Actions */}
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {profile?.name || session?.user?.name || "Wafilow Member"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {profile?.email || session?.user?.email}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  Recommended size: Square 400×400px. Formats: JPG, PNG, WebP, or GIF (max 3MB).
                </p>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                {previewUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={isUploadingPhoto}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading Photo...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm & Save Photo
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelPreview}
                      disabled={isUploadingPhoto}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {profile?.image ? "Change Photo" : "Upload Photo"}
                    </button>

                    {profile?.image && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isRemovingPhoto}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRemovingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Remove Photo
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== CARD 2: ACCOUNT INFORMATION ===================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Personal Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update how your name appears to colleagues and in audit logs.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs sm:text-sm cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Email is locked to your authenticated login credentials.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingName || displayName === profile?.name}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              >
                {isSavingName ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ===================== CARD 3: WORKSPACE & ROLE CONTEXT ===================== */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Workspace Identity
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organization and tenant isolation details for your authenticated session.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block text-[11px] mb-1">Organization Workspace</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {profile?.organizationName || "Default Workspace"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block text-[11px] mb-1">Assigned Role</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {profile?.role || "Administrator"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block text-[11px] mb-1">User Identifier</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate block">
                {profile?.id || session?.user?.id || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
