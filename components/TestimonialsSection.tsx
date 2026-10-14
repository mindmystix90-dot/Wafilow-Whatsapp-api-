"use client";

import { Users, Star } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  initials: string;
  bgColor: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Amit Verma",
    role: "E-commerce Brand",
    initials: "AV",
    bgColor: "from-amber-500 to-orange-600",
    quote: "Wafilow completely transformed our customer support. We now manage 1000+ chats effortlessly.",
  },
  {
    name: "Sneha Kapoor",
    role: "D2C Business",
    initials: "SK",
    bgColor: "from-rose-500 to-pink-600",
    quote: "The automation and broadcast features save us hours every week. Highly recommended!",
  },
  {
    name: "Karan Mehta",
    role: "Digital Agency",
    initials: "KM",
    bgColor: "from-indigo-600 to-violet-600",
    quote: "Easy to use, powerful integrations, and amazing support. Exactly what we needed.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white dark:bg-[#070b12] border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading */}
          <div className="lg:col-span-4 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 px-3.5 py-1 rounded-full">
              <Users className="w-3.5 h-3.5" />
              <span>CUSTOMERS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.15]">
              Loved by <span className="text-violet-600 dark:text-violet-400">growing businesses</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              See how businesses are using Wafilow to grow their sales and improve customer support.
            </p>
          </div>

          {/* Right Column: 3 Testimonial Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((item) => (
              <div
                key={item.name}
                className="p-6 rounded-2xl bg-slate-50/70 dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Author Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-tr ${item.bgColor} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {item.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {item.role}
                      </p>
                    </div>
                  </div>

                  {/* 5 Gold Stars */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
