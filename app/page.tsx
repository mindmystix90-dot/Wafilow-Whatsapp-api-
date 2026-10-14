"use client";

import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import HeroSection from "@/components/HeroSection";
import LogosStrip from "@/components/LogosStrip";
import WhyWafilowSection from "@/components/WhyWafilowSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import BottomCTASection from "@/components/BottomCTASection";
import WatchDemoModal from "@/components/WatchDemoModal";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#070a13] text-slate-100 antialiased selection:bg-violet-600 selection:text-white">
      {/* Top Header Navigation */}
      <PublicHeader onOpenDemo={() => setDemoModalOpen(true)} />

      <main className="flex-1">
        {/* 1. Hero Section matching reference image */}
        <HeroSection onOpenDemo={() => setDemoModalOpen(true)} />

        {/* 2. Trusted by Businesses of all Sizes (Logo Strip) */}
        <LogosStrip />

        {/* 3. Everything You Need to Grow on WhatsApp (Why Wafilow) */}
        <WhyWafilowSection />

        {/* 4. Connect With Your Favorite Tools (Integrations) */}
        <IntegrationsSection />

        {/* 5. Loved by Growing Businesses (Testimonials) */}
        <TestimonialsSection />

        {/* 6. Simple, Transparent Pricing */}
        <PricingSection />

        {/* 7. Bottom CTA Banner */}
        <BottomCTASection onOpenDemo={() => setDemoModalOpen(true)} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Watch Demo Modal */}
      <WatchDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
