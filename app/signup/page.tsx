"use client";

import { Suspense } from "react";
import LoginPage from "../login/page";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
