"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationPausedMsg, setRegistrationPausedMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/platform/status");
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data?.maintenanceMode || data?.registrationPaused) {
          setRegistrationPausedMsg(
            data.maintenanceMessage ||
              "New account registration is temporarily paused during scheduled maintenance."
          );
        }
      } catch {
        // Soft fail
      }
    }
    checkStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call real registration endpoint with dedicated tenant organization
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 2. Automatically log in the user
      const loginRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (!loginRes || loginRes.error || !loginRes.ok) {
        router.push("/login?registered=true");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(`Registration error: ${msg}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl transition-all">
      {/* Brand Header matching image.png */}
      <div className="flex flex-col items-center text-center mb-7">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md group-hover:scale-105 transition-transform">
            W
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Wafilow
          </span>
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Create Your Account
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          Start your 7-day free trial today.
        </p>
      </div>

      {registrationPausedMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>{registrationPausedMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sign Up Form matching image.png */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            required
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Password (min. 6 characters)
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 pr-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Checkbox Terms agreement matching image.png */}
        <div className="flex items-center gap-2.5 pt-1">
          <input
            id="termsCheckbox"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="termsCheckbox" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer">
            I agree to the{" "}
            <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(registrationPausedMsg)}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating your account...</span>
            </>
          ) : registrationPausedMsg ? (
            <span>Registration Temporarily Paused</span>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Social Divider matching image.png */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80 dark:border-slate-800/80" />
        </div>
        <span className="relative px-3 text-xs text-slate-400 bg-white dark:bg-[#0c1220] uppercase font-semibold tracking-wider">
          or continue with
        </span>
      </div>

      {/* Social Sign-in Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() =>
            setError("Please create your workspace account using email and password above.")
          }
          className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setError("Please create your workspace account using email and password above.")
          }
          className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <span>Meta</span>
        </button>
      </div>

      {/* Footer Switch matching image.png */}
      <div className="mt-7 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
        >
          Login
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/80 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 antialiased">
      <Suspense
        fallback={
          <div className="w-full max-w-[440px] p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
