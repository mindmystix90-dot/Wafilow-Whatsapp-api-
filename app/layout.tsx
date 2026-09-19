import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Wafilow WhatsApp API",
  description: "WhatsApp Business API management platform for omnichannel inbox, automated campaigns, contact lists, and template management.",
  openGraph: {
    title: "Wafilow WhatsApp API",
    description: "WhatsApp Business API management platform for omnichannel inbox, automated campaigns, contact lists, and template management.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
