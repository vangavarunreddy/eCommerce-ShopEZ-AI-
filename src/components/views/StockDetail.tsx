import React, { useState, useEffect } from "react";
import { Stock, Holding } from "../../types";
import { useApp } from "../AppContext";
import { StockMiniChart } from "../StockMiniChart";
import { ArrowLeft, Star, ShoppingBag, ShieldAlert, Sparkles, TrendingUp, Info } from "lucide-react";

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
  onNavigate: (view: string, arg?: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
}

export const StockDetail: React.FC<StockDetailProps> = ({
  symbol,
  onBack,
  onNavigate,
  isWatchlisted,
  onToggleWatchlist,
}) => {
  const { user, showToast, refreshUserContext } = useApp();
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Trade parameters
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [tradeQty, setTradeQty] = useState(1);
  const [executingTrade, setExecutingTrade] = useState(false);

  // Personal Holding matching this asset
  const [holding, setHolding] = useState<Holding | null>(null);

  // Quick AI forecasts inside terminal
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const fetchStockDetail = async () => {
    try {
      const res = await fetch(`/api/stocks/${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setStock(data);
      } else {
        showToast(`Stock symbol ${symbol} not found on this exchange.`, "error");
        onBack();
      }
    } catch (e) {
      console.error("Failed to load stock ticker detail", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHolding = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("tradex_token");
      const response = await fetch("/api/stocks/user/portfolio", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const matched = data.holdings.find((h: Holding) => h.symbol === symbol);
        setHolding(matched || null);
      }
    } catch (e) {
      console.error("Failed to fetch matched holding", e);
    }
  };

  useEffect(() => {
    fetchStockDetail();
    fetchUserHolding();

    // Refresh stocks info every 5 seconds for live pricing feeds
    const interval = setInterval(fetchStockDetail, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Authentication required. Please sign in to execute virtual trades.", "error");
      onNavigate("login");
      return;
    }

    if (tradeQty <= 0 || isNaN(tradeQty)) {
      showToast("Please enter a positive integer index.", "error");
      return;
    }

    setExecutingTrade(true);
    try {
      const token = localStorage.getItem("tradex_token");
      const res = await fetch("/api/stocks/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          type: tradeType,
          quantity: tradeQty,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        await refreshUserContext();
        await fetchUserHolding();
      } else {
        showToast(data.error || "Trade transaction failed.", "error");
      }
    } catch (err) {
      showToast("Network execution exception matched on trade pipelines.", "error");
    } finally {
      setExecutingTrade(false);
    }
  };

  const fetchAiMetrics = async () => {
    setLoadingAnalysis(true);
    setAiAnalysis("");
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.prediction);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to load forecast.", "error");
      }
    } catch (e) {
      showToast("Failed to compile AI insights.", "error");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading || !stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono">Synchronizing Exchange Terminal...</p>
      </div>
    );
  }

  // Calculate percentage gain/loss based on historical first
  const initialPrice = stock.history[0]?.price || stock.price;
  const pctChange = ((stock.price - initialPrice) / initialPrice) * 100;
  const isUp = pctChange >= 0;

  const totalCalculatedCost = stock.price * tradeQty;

  return (
    <div className="space-y-8 max-w-6xl mx-auto anim-all animate-fade-in pb-16">
      
      {/* HEADER BAR AND BACK ARROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-amber-50 self-start p-1.5 focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Market Board
        </button>

        {/* Watchlist Star Toggle */}
        <button
          onClick={onToggleWatchlist}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold self-start tracking-tight transition ${
            isWatchlisted
              ? "bg-amber-500/15 border-amber-500/30 text-amber-500"
              : "bg-white border-slate-250 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? "fill-current" : ""}`} />
          <span>{isWatchlisted ? "In Watchlist" : "Watch Stock"}</span>
        </button>
      </div>

      {/* CORE INFO & PRICE CARD PANEL */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* BIG CHART AREA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-extrabold font-mono text-emerald-500 block">
                  Exchange Real-Time Counter
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {stock.name} <span className="text-gray-400 font-mono text-lg font-bold">({stock.symbol})</span>
                </h3>
              </div>

              <div className="text-right">
                <span className="block font-mono text-3xl font-black">${stock.price.toFixed(2)}</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono ${
                    isUp ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {pctChange.toFixed(2)}% (30d Trend)
                </span>
              </div>
            </div>

            {/* Interactive smooth chart visualizer */}
            <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              <StockMiniChart history={stock.history} showTooltip={true} height={200} />
            </div>

            {/* KEY METRICS STATS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-150 dark:border-slate-800 text-xs font-mono">
              <div className="p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl">
                <span className="opacity-60 block text-[10px] uppercase">Daily High</span>
                <span className="font-bold text-sm tracking-tight">${stock.high.toFixed(2)}</span>
              </div>
              <div className="p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl">
                <span className="opacity-60 block text-[10px] uppercase">Daily Low</span>
                <span className="font-bold text-sm tracking-tight">${stock.low.toFixed(2)}</span>
              </div>
              <div className="p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl">
                <span className="opacity-60 block text-[10px] uppercase">Volume</span>
                <span className="font-bold text-sm tracking-tight">{(stock.volume).toLocaleString()}</span>
              </div>
              <div className="p-2 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl">
                <span className="opacity-60 block text-[10px] uppercase">Market Cap</span>
                <span className="font-bold text-sm tracking-tight">${(stock.marketCap / 1000000000).toFixed(1)}B</span>
              </div>
            </div>

          </div>

          {/* AI COMPILER SENTIMENT CARD */}
          <div className="bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 dark:from-indigo-950/15 dark:to-emerald-950/10 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h4 className="font-bold text-base">Gemini Momentum Forecast</h4>
              </div>
              <button
                onClick={fetchAiMetrics}
                disabled={loadingAnalysis}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {loadingAnalysis ? "Analysing Ticks..." : "Generate AI Insight"}
              </button>
            </div>

            {aiAnalysis ? (
              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-5 rounded-2xl">
                {aiAnalysis}
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-normal font-sans">
                Curious if **{stock.symbol}** is showing bullish momentum or bearish consolidation? Fetch our direct machine-learning analyzer prediction card to review resistance pivots, support boundaries, and short-term projections.
              </p>
            )}
          </div>
        </div>

        {/* SIDEBAR EXECUTION CARD */}
        <div className="space-y-6">
          
          {/* TRADE ACTION FORM CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-base">Order Execution</h4>
              <p className="text-[10px] text-slate-400 font-mono">Simulated Instant Matching Engine</p>
            </div>

            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                  tradeType === "BUY"
                    ? "bg-emerald-500 text-white font-black"
                    : "text-slate-600 dark:text-slate-300"
                }`}
                onClick={() => setTradeType("BUY")}
              >
                BUY SHARES
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                  tradeType === "SELL"
                    ? "bg-rose-500 text-white font-black"
                    : "text-slate-600 dark:text-slate-300"
                }`}
                onClick={() => setTradeType("SELL")}
              >
                SELL SHARES
              </button>
            </div>

            <form onSubmit={handleTrade} className="space-y-4 font-mono text-xs">
              
              {/* Quantity Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 block">Shares Quantity</label>
                <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950/45">
                  <button
                    type="button"
                    onClick={() => setTradeQty((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-2 font-bold text-base hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={tradeQty}
                    onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-transparent py-2.5 font-bold focus:outline-none text-sm text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setTradeQty((q) => q + 1)}
                    className="px-3.5 py-2 font-bold text-base hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Estimate overview list */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="opacity-70">Price per Share:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">${stock.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="opacity-70">Estimated {tradeType === "BUY" ? "Cost" : "Proceeds"}:</span>
                  <span className="font-black text-sm text-slate-900 dark:text-white">${totalCalculatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Execution submission button */}
              <button
                type="submit"
                disabled={executingTrade}
                className={`w-full py-3 hover:shadow-lg text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                  tradeType === "BUY"
                    ? "bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/20"
                    : "bg-rose-500 hover:bg-rose-600 hover:shadow-rose-500/20"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {executingTrade ? "Executing Trade..." : `Execute ${tradeType} Order`}
              </button>

            </form>
          </div>

          {/* ACTIVE POSITION CURRENT STATUS CARD */}
          {user && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs text-xs space-y-3">
              <h4 className="font-bold text-sm tracking-tight text-slate-800 dark:text-amber-50">
                Your Position in {stock.symbol}
              </h4>
              {holding ? (
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="opacity-70">Shares Held:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{holding.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Average Price:</span>
                    <span className="font-bold text-slate-800 dark:text-white">${holding.averagePurchasePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Cur Net Equity:</span>
                    <span className="font-bold text-slate-800 dark:text-white">${holding.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">Total Profit/Loss:</span>
                    <span
                      className={`font-bold font-mono ${
                        holding.profitLoss >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      ${holding.profitLoss >= 0 ? "+" : ""}
                      {holding.profitLoss.toLocaleString()} ({holding.profitLossPct}%)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 leading-normal">
                  You do not currently own any active holdings in **{stock.symbol}**. Purchase a fraction of a share using your dry virtual balance cash above to start monitoring portfolio gains.
                </p>
              )}
            </div>
          )}

          {/* AI Terminology Tip Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-xs space-y-2">
            <h4 className="font-bold flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-indigo-400" /> AI Coach Pro Tip</h4>
            <p className="text-[11px] text-slate-400 leading-normal font-sans">
              "When placing orders on high-volatility tickers like Tesla, always preserve at least 20% of your total balance as liquidity. This strategy, known as reserving dry powder, lets you purchase future dips and average down your acquisition cost."
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
