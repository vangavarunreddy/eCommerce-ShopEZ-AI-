import React, { useState, useEffect } from "react";
import { PortfolioSummary, Holding } from "../../types";
import { Briefcase, ArrowUpRight, TrendingUp, HelpCircle, Activity, Sparkles, RefreshCw } from "lucide-react";

interface PortfolioProps {
  onNavigate: (view: string, arg?: string) => void;
  onRefresh: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ onNavigate, onRefresh }) => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem("tradex_token");
      const response = await fetch("/api/stocks/user/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Failed to load portfolio statistics", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSync = () => {
    setRefreshing(true);
    fetchPortfolio();
    onRefresh();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono">Quantifying Portfolio Assets...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 max-w-lg mx-auto">
        <p className="font-semibold text-slate-500">Failed to load asset summaries.</p>
        <p className="text-xs text-slate-400">Ensure you are logged in and refresh your internet session.</p>
      </div>
    );
  }

  const isProfitable = summary.netProfitLoss >= 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      
      {/* HEADER TITLE */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Asset Holdings
          </h2>
          <p className="text-xs text-slate-500">Overview of net virtual worth and transaction aggregates</p>
        </div>

        <button
          onClick={handleSync}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Net Worth
        </button>
      </div>

      {/* CORE BIG VALUE STATS CARD */}
      <div className="grid sm:grid-cols-3 gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm relative overflow-hidden">
        
        {/* Background glow lines */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />

        {/* Portfolio Net Worth */}
        <div className="space-y-1 sm:border-r border-slate-100 dark:border-slate-800/80 pr-4">
          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
            Net Simulated Worth
          </span>
          <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            ${(summary.currentPortfolioValue + summary.userWalletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <p className="text-[10px] text-slate-400 font-sans leading-none block">
            Wallet Balance + Stocks Value
          </p>
        </div>

        {/* Stocks Equity */}
        <div className="space-y-1 sm:border-r border-slate-100 dark:border-slate-800/80 sm:px-4">
          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
            Active Stock Equity
          </span>
          <span className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white block">
            ${summary.currentPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 font-mono leading-none block uppercase">
            {summary.holdings.length} Active Holdings
          </span>
        </div>

        {/* Net Profits / Returns */}
        <div className="space-y-1 sm:pl-4">
          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block">
            Total Profit / Loss
          </span>
          <span
            className={`text-2.5xl font-black font-mono tracking-tight flex items-baseline gap-1.5 leading-none ${
              isProfitable ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isProfitable ? "+" : ""}
            ${summary.netProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span
            className={`text-[10px] font-mono leading-none font-bold block ${
              isProfitable ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isProfitable ? "▲" : "▼"} {summary.netProfitLossPct.toFixed(2)}% Return
          </span>
        </div>

      </div>

      {/* AI PORTFOLIO COMPILER ACTION BANNER */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-indigo-500/15 border border-indigo-500/20 dark:border-indigo-500/10 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/15 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight text-indigo-950 dark:text-amber-50">
              Deep LLM Portfolio Rebalancer
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Our Gemini server engine evaluates your entire asset exposure list, maps tech-concentration risks, calculates diversification ratios, and drafts actionable suggestions.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate("ai")}
          className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-indigo-500/20 transition cursor-pointer shrink-0"
        >
          Activate Gemini Diagnostics
        </button>
      </div>

      {/* DETAILED ACTIVE HOLDINGS CATALOG TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base">Allocations Ledger</h3>
          <p className="text-xs text-slate-400">Detailed list of currently held shares</p>
        </div>

        {summary.holdings.length === 0 ? (
          <div className="text-center py-20 p-10 font-sans space-y-3">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-500">Your Portfolio is Empty</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              You haven't bought any virtual stock shares yet! Jump to our Market Board to practice buying, sell, and build wealth!
            </p>
            <button
              onClick={() => onNavigate("market")}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition"
            >
              Search Market Tickers
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/45 font-mono text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left font-bold font-mono">Stock Asset</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Shares Owned</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Avg Cost</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Current Price</th>
                  <th className="px-4 py-4 text-right font-bold font-mono">Total Value</th>
                  <th className="px-6 py-4 text-right font-bold font-mono">Total Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {summary.holdings.map((h) => {
                  const gain = h.profitLoss >= 0;
                  return (
                    <tr
                      key={h.symbol}
                      onClick={() => onNavigate("stock-detail", h.symbol)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      {/* Asset identifier */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-mono font-black text-slate-900 dark:text-white block">
                            {h.symbol}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {h.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Shares density */}
                      <td className="px-4 py-4 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                        {h.quantity}
                      </td>

                      {/* Purchased price */}
                      <td className="px-4 py-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        ${h.averagePurchasePrice.toFixed(2)}
                      </td>

                      {/* Current price ticks */}
                      <td className="px-4 py-4 text-center font-mono text-slate-600 dark:text-slate-400 font-semibold">
                        ${h.currentPrice.toFixed(2)}
                      </td>

                      {/* Total evaluation */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${h.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Return statistics columns */}
                      <td className="px-6 py-4 text-right font-mono">
                        <span
                          className={`font-mono font-bold block ${
                            gain ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {gain ? "+" : ""}
                          ${h.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`text-[10px] font-mono leading-none block ${
                            gain ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {gain ? "▲" : "▼"} {h.profitLossPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
