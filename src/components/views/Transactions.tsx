import React, { useState, useEffect } from "react";
import { Transaction } from "../../types";
import { History, ShieldAlert, ShoppingBag, ArrowUpRight } from "lucide-react";

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem("tradex_token");
        const response = await fetch("/api/stocks/user/transactions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        }
      } catch (e) {
        console.error("Failed to load user transactions ledger logs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-xs font-mono">Loading Trade Logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* TITLE HEADS */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-500" /> Virtual Trade Logs
        </h2>
        <p className="text-xs text-slate-500">Comprehensive ledger of all completed BUY and SELL execution logs</p>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-3">
          <ShieldAlert className="w-12 h-12 text-slate-305 mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-slate-500">No transactions recorded.</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Your ledger is empty. Any stock actions you execute on the exchange board will register instantly in this ledger.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="px-6 py-4 text-left font-bold font-mono">Invoice ID</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Asset</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Type</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Unit Price</th>
                  <th className="px-4 py-4 text-center font-bold font-mono">Shares Count</th>
                  <th className="px-4 py-4 text-right font-bold font-mono">Total Capital</th>
                  <th className="px-6 py-4 text-right font-bold font-mono">Matched Execution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {transactions.map((tx) => {
                  const isBuy = tx.type === "BUY";
                  const totalCapital = tx.price * tx.quantity;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      {/* ID */}
                      <td className="px-6 py-4 font-mono font-medium text-slate-500 text-[10px]">
                        {tx.id.toUpperCase()}
                      </td>

                      {/* Stock Symbol */}
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-slate-900 dark:text-white block">{tx.symbol}</span>
                      </td>

                      {/* Type Tag badge */}
                      <td className="px-4 py-4 text-center font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                            isBuy
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500"
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* Price per share */}
                      <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-350">
                        ${tx.price.toFixed(2)}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {tx.quantity}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white">
                        ${totalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-right text-slate-400 text-[10px]">
                        {new Date(tx.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
