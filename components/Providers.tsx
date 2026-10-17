"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { WhatsAppConnectionProvider } from "@/contexts/WhatsAppConnectionContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <WhatsAppConnectionProvider>
        {children}
      </WhatsAppConnectionProvider>
    </SessionProvider>
  );
}
