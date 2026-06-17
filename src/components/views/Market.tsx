import React, { useState, useEffect } from "react";
import { Stock } from "../../types";
import { Search, TrendingDown, ArrowUpDown, DollarSign, ArrowRight, Star, RefreshCw } from "lucide-react";

interface MarketProps {
  onNavigate: (view: string, arg?: string) => void;
  watchlistSymbols: string[];
  onToggleWatchlist: (symbol: string) => void;
}

export const Market: React.FC<MarketProps> = ({ onNavigate, watchlistSymbols, onToggleWatchlist }) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("volume_desc");
  const [refreshing, setRefreshing] = useState(false);

  // Core Stock Loader query
  const loadStocks = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (search) qParams.set("q", search);
      if (minPrice) qParams.set("minPrice", minPrice);
      if (maxPrice) qParams.set("maxPrice", maxPrice);
      if (sortBy) qParams.set("sortBy", sortBy);

      const response = await fetch(`/api/stocks?${qParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStocks(data);
      }
    } catch (e) {
      console.error("Market stock fetch failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStocks();
    // Start continuous fast pulling for live updates (matches WebSocket or polling rule)
    const interval = setInterval(() => loadStocks(true), 5000);
    return () => clearInterval(interval);
  }, [search, minPrice, maxPrice, sortBy]);

  const triggerManualRefresh = () => {
    setRefreshing(true);
    loadStocks();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto anim-all animate-fade-in">
      
      {/* HUB HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Market Board
          </h2>
          <p className="text-xs text-slate-500">Live ticks update automatically every 5 seconds</p>
        </div>

        <button
          onClick={triggerManualRefresh}
          className="self-start px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Force Sync
        </button>
      </div>

      {/* SEARCH AND FILTERS PANEL */}
      <div className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          
          {/* SEARCH BY KEYWORDS */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search symbol or company name... (e.g. Tesla, AAPL)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-transparent focus:border-emerald-500/50 focus:outline-none pl-9 pr-4 py-2.5 text-xs text-slate-700 dark:text-slate-100"
            />
          </div>

          {/* FILTER: SORTING PARAMETER */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-transparent focus:border-emerald-500/50 focus:outline-none px-4 py-2.5 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-100"
            >
              <option value="volume_desc">Sort by Vol (High → Low)</option>
              <option value="marketcap_desc">Sort by Cap (High → Low)</option>
              <option value="price_desc">Price (High → Low)</option>
              <option value="price_asc">Price (Low → High)</option>
              <option value="name_asc">Alphabetical (A - Z)</option>
            </select>
          </div>

          {/* PRICE RANGE FILTERS */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min ($)"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-0 flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-transparent focus:border-emerald-500/50 focus:outline-none px-3 py-2 text-xs font-mono"
            />
            <input
              type="number"
              placeholder="Max ($)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-0 flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-transparent focus:border-emerald-500/50 focus:outline-none px-3 py-2 text-xs font-mono"
            />
          </div>

        </div>
      </div>

      {/* CORE CATALOG STOCK MATRIX LIST */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-40" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 font-sans space-y-2">
          <p className="font-semibold text-slate-500">No trading stocks found matching options.</p>
          <p className="text-xs text-slate-400">Clear directories, modify max prices, or enter alternative keywords.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocks.map((s) => {
            // Determine percentage gain/loss based on last historic price in index
            const initialPrice = s.history[0]?.price || s.price;
            const pctChange = ((s.price - initialPrice) / initialPrice) * 100;
            const isGain = pctChange >= 0;
            const isWatchlisted = watchlistSymbols.includes(s.symbol);

            return (
              <div
                key={s.symbol}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/95 dark:border-slate-800 hover:border-emerald-500/35 dark:hover:border-emerald-500/30 p-5 rounded-2xl shadow-xs transition-all flex flex-col justify-between hover:shadow-md relative overflow-hidden group"
              >
                
                {/* Watchlist toggle tag */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(s.symbol);
                  }}
                  className={`absolute top-4 right-4 p-1.5 rounded-lg border transition ${
                    isWatchlisted
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:border-slate-700"
                  }`}
                  title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  <Star className={`w-3.5 h-3.5 ${isWatchlisted ? "fill-current" : ""}`} />
                </button>

                {/* Stock Identification */}
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 font-mono tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                    {s.symbol}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate pr-8">
                    {s.name}
                  </h4>
                </div>

                {/* Pricing & Gain/Loss indicator row */}
                <div className="py-4 flex items-baseline justify-between gap-2 border-b border-dashed border-slate-100 dark:border-slate-800 mb-4">
                  <div className="font-mono font-black text-2xl tracking-tight text-slate-900 dark:text-white">
                    ${s.price.toFixed(2)}
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold flex items-center gap-1 shrink-0 ${
                      isGain
                        ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20"
                        : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20"
                    }`}
                  >
                    {isGain ? "+" : ""}
                    {pctChange.toFixed(2)}%
                  </div>
                </div>

                {/* Core parameters metrics */}
                <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-slate-500 mb-4">
                  <div>
                    <span className="opacity-75">Daily Vol:</span>{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-300">
                      {(s.volume / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="opacity-75">Market Cap:</span>{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-300">
                      ${(s.marketCap / 1000000000).toFixed(1)}B
                    </span>
                  </div>
                </div>

                {/* Forward terminal navigation */}
                <button
                  onClick={() => onNavigate("stock-detail", s.symbol)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-2 cursor-pointer border border-transparent dark:border-slate-800"
                >
                  Trade Terminal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
