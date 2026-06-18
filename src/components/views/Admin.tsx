import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { User, Order, Announcement, SuspiciousAudit } from "../../types";
import { 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Megaphone, 
  Sparkles, 
  IndianRupee, 
  ShoppingCart, 
  Package, 
  Trash2, 
  Edit, 
  Check, 
  Plus, 
  ShieldCheck,
  UserCheck,
  X
} from "lucide-react";

export const Admin: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user, showToast, refreshUserContext } = useApp();

  const [usersList, setUsersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [suspiciousList, setSuspiciousList] = useState<SuspiciousAudit[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState<"news" | "maintenance" | "system">("system");
  const [postingAnnounce, setPostingAnnounce] = useState(false);

  // Balance Override Form Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [customBalance, setCustomBalance] = useState("");
  const [submittingBalance, setSubmittingBalance] = useState(false);

  // AI Executive Analytics Report
  const [aiReport, setAiReport] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Load analytics KPIs
      const analRes = await fetch("/api/admin/dashboard-analytics", { headers });
      if (analRes.ok) {
        const analData = await resJSON(analRes);
        setAnalytics(analData);
      }

      // Load users
      const usersRes = await fetch("/api/admin/users", { headers });
      if (usersRes.ok) {
        setUsersList(await resJSON(usersRes));
      }

      // Load transactions
      const transRes = await fetch("/api/admin/transactions", { headers });
      if (transRes.ok) {
        setOrdersList(await resJSON(transRes));
      }

      // Load suspicious audits
      const suspRes = await fetch("/api/admin/suspicious", { headers });
      if (suspRes.ok) {
        setSuspiciousList(await resJSON(suspRes));
      }

      // Load announcements (public)
      const annRes = await fetch("/api/public/announcements");
      if (annRes.ok) {
        setAnnouncementsList(await resJSON(annRes));
      }

    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const resJSON = async (res: Response) => {
    return await res.json();
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      showToast("Please fill in the announcement title and description.", "error");
      return;
    }

    setPostingAnnounce(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: annTitle, content: annContent, category: annCategory })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setAnnTitle("");
        setAnnContent("");
        loadAdminData();
      } else {
        showToast(data.error || "Failed to publish bulletin.", "error");
      }
    } catch (err) {
      showToast("Network error publishing bulletin.", "error");
    } finally {
      setPostingAnnounce(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bulletin?")) return;
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        loadAdminData();
      } else {
        showToast(data.error || "Failed to delete announcement.", "error");
      }
    } catch (e) {
      showToast("Network error deleting announcement.", "error");
    }
  };

  const handleOverrideBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !customBalance) return;

    const amt = parseFloat(customBalance);
    if (isNaN(amt) || amt < 0) {
      showToast("Please enter a valid positive balance amount.", "error");
      return;
    }

    setSubmittingBalance(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ balance: amt })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setSelectedUser(null);
        setCustomBalance("");
        loadAdminData();
        refreshUserContext();
      } else {
        showToast(data.error || "Failed to adjust balance.", "error");
      }
    } catch (err) {
      showToast("Network error adjusting user balance.", "error");
    } finally {
      setSubmittingBalance(false);
    }
  };

  const handleUpdateRole = async (userId: string, targetRole: "CUSTOMER" | "SELLER" | "ADMIN") => {
    if (!window.confirm(`Are you sure you want to change this user's role to '${targetRole}'?`)) return;
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: targetRole })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        loadAdminData();
      } else {
        showToast(data.error || "Failed to update role.", "error");
      }
    } catch (err) {
      showToast("Network error modifying role.", "error");
    }
  };

  const handleLoadReport = async () => {
    setLoadingReport(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch("/api/ai/insights", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.analysis);
      } else {
        showToast("AI report query failed.", "error");
      }
    } catch (e) {
      showToast("Error generating AI business report.", "error");
    } finally {
      setLoadingReport(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const { summary } = analytics;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-extrabold tracking-tight font-display">Platform Admin Core</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verify overall operations metrics, manage user role profiles, publish alerts, and audits fraud vectors.</p>
      </div>

      {/* CORE KPI SUMMARY CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500"><IndianRupee className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Sales Revenue</span>
            <span className="text-lg font-bold font-mono">₹{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500"><ShoppingCart className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Checkouts</span>
            <span className="text-lg font-bold font-mono">{summary.totalOrders} Orders</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Users className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Active Merchants</span>
            <span className="text-lg font-bold font-mono">{summary.sellersCount} Sellers</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Package className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Catalog Scale</span>
            <span className="text-lg font-bold font-mono">{summary.totalProducts} Products</span>
          </div>
        </div>

      </div>

      {/* USER MANAGEMENT & SUSPICIOUS ANOMALIES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* User Account Controls */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">User Moderation & Wallets</h3>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-3">
                        <span className="font-bold block">{u.name}</span>
                        <span className="text-[10px] text-slate-450 font-mono">{u.email}</span>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as any)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded focus:outline-none"
                        >
                          <option value="CUSTOMER">Customer</option>
                          <option value="SELLER">Seller</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
                        ₹{u.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => { setSelectedUser(u); setCustomBalance(String(u.balance)); }}
                          className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-550 text-teal-600 dark:text-teal-400 hover:text-white font-bold rounded cursor-pointer transition-all"
                        >
                          Credit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Suspicious activity audit ledger */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">Fraud Audit Alerts</h3>
          
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {suspiciousList.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500">
                No anomalous user behavior flagged.
              </div>
            ) : (
              suspiciousList.map((aud, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl space-y-2 shadow-sm text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <span className="font-bold tracking-tight">{aud.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      aud.severity === "critical" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {aud.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{aud.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ANNOUNCEMENT BOARD & NOTICES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Publish bulletins */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">Compose Platform Bulletin</h3>
          
          <form onSubmit={handlePostAnnouncement} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-450 uppercase">Notice Title</label>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="E.g., Scheduled Maintenance"
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-450 uppercase">Bulletin Description</label>
              <textarea
                rows={3}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Details of the announcement notice..."
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 p-3 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-450 uppercase">Category</label>
              <select
                value={annCategory}
                onChange={(e) => setAnnCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
              >
                <option value="system">System Notification</option>
                <option value="news">Global Retail News</option>
                <option value="maintenance">Server Maintenance</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={postingAnnounce}
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Megaphone className="w-4 h-4" /> Publish Bulletin
            </button>
          </form>
        </div>

        {/* Existing announcements catalog */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">Active Bulletins</h3>
          
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {announcementsList.map((a) => (
              <div 
                key={a.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl flex items-start justify-between gap-4 shadow-sm text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-850 dark:text-white">{a.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-bold uppercase font-mono">{a.category}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{a.content}</p>
                  <span className="block text-[9px] text-slate-400 font-mono">Posted: {new Date(a.date).toLocaleDateString()}</span>
                </div>
                
                <button
                  onClick={() => handleDeleteAnnouncement(a.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                  title="Delete Bulletin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* AI OPERATIONS & AUDITING EXECUTIVE REPORT */}
      <section className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 dark:from-teal-950/20 dark:to-indigo-950/20 border border-teal-500/20 dark:border-teal-900/30 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">AI Executive Operations Diagnostic</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Request Gemini LLM to scan store catalog performance, sales velocity, and payment risk matrices</p>
            </div>
          </div>

          <button
            onClick={handleLoadReport}
            disabled={loadingReport}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
          >
            {loadingReport ? "Analyzing Core Operations..." : "Generate AI Audit Report"}
          </button>
        </div>

        {aiReport && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-2xl shadow-inner text-sm leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-250 whitespace-pre-wrap font-sans">
            {aiReport}
          </div>
        )}
      </section>

      {/* BALANCE ADJUSTMENT MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden p-6 relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg mb-1.5">Override Wallet Credit</h3>
            <p className="text-xs text-slate-500 mb-4">Set mock wallet balances for customer account <b>{selectedUser.name}</b></p>
            
            <form onSubmit={handleOverrideBalance} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-slate-400 uppercase">Set Balance Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold font-mono text-slate-400 pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customBalance}
                    onChange={(e) => setCustomBalance(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-250 dark:border-slate-800 pl-8 pr-4 py-2.5 font-bold font-mono text-lg text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingBalance}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {submittingBalance ? "Modifying Ledger..." : "Apply Ledger Override"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
