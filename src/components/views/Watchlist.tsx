import React, { useState, useEffect } from "react";
import { Stock } from "../../types";
import { Star, ShieldAlert, ArrowRight, Trash2 } from "lucide-react";

interface WatchlistProps {
  onNavigate: (view: string, arg?: string) => void;
  onRefreshTrigger: () => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({ onNavigate, onRefreshTrigger }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem("tradex_token");
      const response = await fetch("/api/stocks/user/watchlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (e) {
      console.error("Failed to load watchlist details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleToggleWatch = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("tradex_token");
      const response = await fetch("/api/stocks/user/watchlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol }),
      });
      if (response.ok) {
        // Remove locally from state list
        setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
        onRefreshTrigger();
      }
    } catch (err) {
      console.error("Toggle error", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono">Synchronizing Watchlist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      {/* INTRO TITLE */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-current" /> Watchlist
        </h2>
        <p className="text-xs text-slate-500">Monitor your hand-picked target list of high interest companies</p>
      </div>

      {stocks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-4">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto" strokeWidth={1.5} />
          <div className="space-y-1">
            <p className="font-semibold text-slate-600 dark:text-slate-300">Your Watchlist is Idle</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Never miss a breakout. Browse our Market Dashboard and click the star tags on any tickers to track them here.
            </p>
          </div>
          <button
            onClick={() => onNavigate("market")}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-white text-xs rounded-xl transition cursor-pointer"
          >
            Explore Market Board
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((s) => {
            const isUp = s.history.length >= 2 ? s.price >= s.history[s.history.length - 2]?.price : true;
            const pct = s.history.length >= 2 ? ((s.price - s.history[0]?.price) / s.history[0]?.price) * 100 : 0;

            return (
              <div
                key={s.symbol}
                onClick={() => onNavigate("stock-detail", s.symbol)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between hover:shadow-md cursor-pointer transition relative group"
              >
                {/* Trash Tag icon to untrack easily */}
                <button
                  onClick={(e) => handleToggleWatch(e, s.symbol)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg border border-slate-100 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-800 dark:hover:bg-rose-950/20 text-slate-400 transition"
                  title="Remove Tracker"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 tracking-wider font-extrabold font-mono text-slate-500">
                    {s.symbol}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate pr-10">
                    {s.name}
                  </h4>
                </div>

                <div className="py-3 flex items-baseline justify-between border-b border-dashed border-slate-150 dark:border-slate-800 mb-3 mt-1">
                  <span className="font-mono text-xl font-black text-slate-900 dark:text-white">${s.price.toFixed(2)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isUp
                        ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/10"
                        : "text-rose-500 bg-rose-50 dark:bg-rose-950/10"
                    }`}
                  >
                    {isUp ? "▲" : "▼"}{pct.toFixed(2)}%
                  </span>
                </div>

                <button className="w-full py-1.5 bg-slate-50 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-all flex items-center justify-center gap-1">
                  Trade Console <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
