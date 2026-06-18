import React, { useState, useEffect } from "react";
import { useApp } from "./AppContext";
import {
  ShoppingBag,
  Wallet,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  LogOut,
  Home as HomeIcon,
  Heart,
  ShoppingCart,
  History,
  X,
  Plus,
  PlusCircle,
  Megaphone
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string, arg?: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeView, onNavigate }) => {
  const { 
    user, 
    logout, 
    theme, 
    toggleTheme, 
    toast, 
    clearToast, 
    refreshUserContext, 
    showToast,
    getCartItemsCount,
    announcements
  } = useApp();



  // Auto-dismiss toast handler
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);



  const navItems = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "shop", label: "Shop", icon: ShoppingBag },
    ...(user
      ? [
          { id: "wishlist", label: "Wishlist", icon: Heart },
          { id: "cart", label: "Cart", icon: ShoppingCart, countBadge: true },
          { id: "orders", label: "Orders", icon: History },
          { id: "ai", label: "AI Shopping", icon: Sparkles, badge: "AI Advisor" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* 1. SCROLLING ANNOUNCEMENT TICKER BANNER */}
      <div className="bg-gradient-to-r from-teal-600 to-indigo-600 dark:from-teal-950 dark:to-indigo-950 border-b border-teal-700 py-2 overflow-hidden text-xs text-white">
        <div className="flex animate-marquee whitespace-nowrap gap-10">
          <span className="font-semibold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded bg-white/20 inline-flex items-center gap-1">
            <Megaphone className="w-3 h-3" /> Special Offers
          </span>
          {announcements.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              <span className="uppercase text-[9px] tracking-wider opacity-75">[{a.category}]</span>
              <span>{a.title}: {a.content}</span>
            </span>
          ))}
          {/* Repeating items for seamless loop */}
          {announcements.map((a) => (
            <span key={`${a.id}-dup`} className="hidden md:inline-flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              <span className="uppercase text-[9px] tracking-wider opacity-75">[{a.category}]</span>
              <span>{a.title}: {a.content}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 2. MAIN HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* BRAND LOGO */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate("home")}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-black text-xl">
                S
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  ShopEZ AI
                </h1>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono tracking-wider font-semibold">
                  SMART COMMERCE
                </span>
              </div>
            </div>

            {/* NAVIGATION LINKS (DESKTOP) */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeView === item.id;
                const count = item.countBadge ? getCartItemsCount() : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer relative ${
                      isActive
                        ? "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                        {count}
                      </span>
                    )}
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {user && (user.role === "SELLER" || user.role === "ADMIN") && (
                <button
                  onClick={() => onNavigate("seller-dashboard")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-teal-600 dark:text-teal-400 border border-teal-500/20 hover:bg-teal-500/10 transition-all cursor-pointer ${
                    activeView === "seller-dashboard" ? "bg-teal-500/15" : ""
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Seller Hub</span>
                </button>
              )}

              {user && user.role === "ADMIN" && (
                <button
                  onClick={() => onNavigate("admin")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all cursor-pointer ${
                    activeView === "admin" ? "bg-indigo-500/15" : ""
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Panel</span>
                </button>
              )}
            </nav>

            {/* QUICK ACTIONS & USER SECTION */}
            <div className="flex items-center gap-3">
              
              {/* Mock Wallet Deposit for Easy Sandbox Checkout */}
              {user && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold border border-slate-200/50 dark:border-slate-700/50" 
                  title="Mock wallet balance"
                >
                  <Wallet className="w-3.5 h-3.5 text-teal-500" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    ₹{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle visual theme"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold tracking-tight">{user.name}</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold capitalize font-mono leading-none">{user.role}</p>
                  </div>
                  <button
                    onClick={logout}
                    aria-label="Sign out"
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate("login")}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-teal-500/25 transition-all cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2 shadow-lg flex justify-around items-center">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeView === item.id;
          const count = item.countBadge ? getCartItemsCount() : 0;
          return (
            <button
              key={`${item.id}-mobile`}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-all relative ${
                isActive ? "text-teal-500 font-bold" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span>{item.label}</span>
              {count > 0 && (
                <span className="absolute top-1 right-3 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {user && (user.role === "SELLER" || user.role === "ADMIN") && (
          <button
            onClick={() => onNavigate("seller-dashboard")}
            className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-teal-600 dark:text-teal-400 ${
              activeView === "seller-dashboard" ? "font-extrabold text-teal-500" : ""
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span>Sellers</span>
          </button>
        )}
      </footer>

      {/* 3. MAIN WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
        {children}
      </main>

      {/* 5. FLOATING ALERT TOAST (NOTIFICATIONS) */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-slide-up">
          <div
            className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
              toast.type === "success"
                ? "bg-teal-500"
                : toast.type === "error"
                ? "bg-rose-500"
                : "bg-indigo-500"
            }`}
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
              {toast.message}
            </p>
          </div>
          <button onClick={clearToast} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
