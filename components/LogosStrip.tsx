"use client";

export default function LogosStrip() {
  return (
    <section className="border-y border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#070a13] py-9">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase block">
          TRUSTED BY BUSINESSES OF ALL SIZES
        </span>

        <div className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-14 lg:gap-x-18 gap-y-6 opacity-90 transition-opacity hover:opacity-100">
          {/* Zomato */}
          <div className="flex items-center text-rose-600 font-black text-2xl tracking-tight select-none">
            zomato
          </div>

          {/* Blinkit */}
          <div className="flex items-center text-slate-900 dark:text-white font-black text-2xl tracking-tight select-none">
            blink<span className="text-amber-400">it</span>
          </div>

          {/* Meesho */}
          <div className="flex items-center text-pink-600 font-extrabold text-2xl tracking-tight select-none">
            meesho
          </div>

          {/* Shopify */}
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl tracking-tight select-none">
            <svg className="w-6 h-6 text-emerald-500 fill-current" viewBox="0 0 24 24">
              <path d="M15.4 3.7c-.1-.7-.8-1.2-1.5-1.1L8.3 3.6c-.6.1-1.1.6-1.1 1.2l-.7 13.9 11.2-1.4-2.3-13.6zm-1.8 1.4l.7 4.1-2.9-.5.7-4.1 1.5.5z"/>
            </svg>
            <span>shopify</span>
          </div>

          {/* JioMart */}
          <div className="flex items-center text-red-600 font-extrabold text-2xl tracking-tight select-none">
            Jio<span className="text-blue-600">Mart</span>
          </div>

          {/* TATA */}
          <div className="flex items-center text-blue-700 dark:text-blue-400 font-serif font-black text-2xl tracking-[0.25em] select-none">
            TATA
          </div>

          {/* Make (formerly integromat) */}
          <div className="flex flex-col items-center select-none">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-black text-xl tracking-tight">
              <span className="text-2xl leading-none">{"///"}</span>
              <span>make</span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium -mt-0.5">
              (formerly integromat)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
