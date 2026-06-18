import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { Order } from "../../types";
import { 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  RotateCcw,
  Printer,
  X,
  FileDown
} from "lucide-react";

export const OrdersList: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const { user, showToast, refreshUserContext } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Invoice viewer modal states
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: "CANCELLED" | "RETURN_REQUESTED") => {
    const confirmMsg = status === "CANCELLED" 
      ? "Are you sure you want to cancel this order? It will restock items and refund paid amounts to your wallet."
      : "Are you sure you want to request a return for this delivered order?";
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        loadOrders();
        refreshUserContext(); // refresh cash balances
      } else {
        showToast(data.error || "Failed to update status", "error");
      }
    } catch (err) {
      showToast("Network error changing order status.", "error");
    }
  };

  const handleFetchInvoice = async (orderId: string) => {
    setLoadingInvoice(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceData(data);
      } else {
        showToast("Failed to fetch invoice details.", "error");
      }
    } catch (e) {
      showToast("Error retrieving invoice.", "error");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(prev => (prev === orderId ? null : orderId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLACED":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "SHIPPED":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "DELIVERED":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "RETURN_REQUESTED":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "RETURNED":
      case "REFUNDED":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-550/20";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6" />
        {[1, 2].map(i => (
          <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight border-l-4 border-teal-500 pl-3">Order History</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Track shipment delivery status, request cancellations, or generate official purchase invoices.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-10 max-w-md mx-auto space-y-4 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-slate-355 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold">No Orders Placed Yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">You haven't checked out any order packages on the platform.</p>
          </div>
          <button
            onClick={() => onNavigate("shop")}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const isExpanded = expandedOrder === o.id;
            return (
              <div 
                key={o.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Header Summary */}
                <div 
                  onClick={() => toggleExpand(o.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 cursor-pointer hover:bg-slate-550 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-xs font-mono">ORD-{o.id.slice(-8).toUpperCase()}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(o.status)}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Placed: {new Date(o.createdAt).toLocaleString()} | Items: {o.products.reduce((s,p)=>s+p.quantity,0)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="block font-bold font-mono text-sm">₹{o.totalAmount.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 capitalize font-mono">Via {o.paymentMethod}</span>
                    </div>

                    <div className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                      {isExpanded ? <ChevronUp className="w-4.5 h-4.5 text-slate-450" /> : <ChevronDown className="w-4.5 h-4.5 text-slate-455" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-950/20 space-y-6">
                    
                    {/* Products details */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Order Items</h4>
                      <div className="space-y-2">
                        {o.products.map((p, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/50 p-3 rounded-xl text-xs"
                          >
                            <div>
                              <span 
                                className="font-bold text-slate-800 dark:text-slate-100 hover:text-teal-500 cursor-pointer"
                                onClick={() => onNavigate("product-detail", p.productId)}
                              >
                                {p.title}
                              </span>
                              {p.variant && <span className="text-[10px] text-slate-400 block mt-0.5">Variant: {p.variant}</span>}
                            </div>
                            <div className="text-right font-mono font-semibold">
                              <span>{p.quantity}x</span>
                              <span className="ml-2">₹{(p.price * p.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping and Delivery parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                      
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Shipping Details</h4>
                        <div className="flex items-start gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/50">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold block">{o.userName}</span>
                            <span className="text-slate-500 dark:text-slate-450 leading-relaxed">
                              {o.shippingAddress.street}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.zip}, {o.shippingAddress.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Tracking & Payment</h4>
                        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/50 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span>Tracking Number: <span className="font-mono font-semibold text-teal-500">{o.trackingNumber}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            <span>Payment: <span className="font-semibold">{o.paymentMethod}</span> ({o.paymentStatus})</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Actions panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="flex gap-2">
                        {o.status === "PLACED" && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, "CANCELLED")}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 border border-rose-500/10"
                          >
                            <XCircle className="w-4 h-4" /> Cancel Order
                          </button>
                        )}
                        {o.status === "DELIVERED" && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, "RETURN_REQUESTED")}
                            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500 text-purple-600 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1 border border-purple-500/10"
                          >
                            <RotateCcw className="w-4 h-4" /> Request Return
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleFetchInvoice(o.id)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-slate-400" /> View Invoice
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. SIMULATED INVOICE DOWNLOAD MODAL OVERLAY */}
      {invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative space-y-6">
            
            {/* Modal Close */}
            <button
              onClick={() => setInvoiceData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print trigger */}
            <div className="flex justify-end gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/10"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <button
                onClick={() => {
                  alert("Invoice download triggered! (Saved as PDF on local drive mockup)");
                  setInvoiceData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-slate-455" /> Save PDF
              </button>
            </div>

            {/* Printable Area */}
            <div className="space-y-6 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10">
              
              {/* Invoice Headers */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-teal-600 dark:text-teal-400 font-display">ShopEZ AI Platform</h3>
                  <span className="text-[10px] text-slate-450 block font-mono">Invoice Receipt & Bill details</span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="block font-bold text-sm font-mono text-slate-800 dark:text-white">{invoiceData.invoiceNumber}</span>
                  <span className="text-[10px] text-slate-400">Date: {invoiceData.invoiceDate}</span>
                </div>
              </div>

              {/* Billed To / Shipping Address info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 font-display">Billed To (Customer):</span>
                  <span className="block font-bold text-sm text-slate-850 dark:text-slate-100">{invoiceData.customer.name}</span>
                  <span className="block text-slate-500">{invoiceData.customer.email}</span>
                  <span className="block text-slate-500">Phone: {invoiceData.customer.phone || "N/A"}</span>
                </div>

                <div className="space-y-1">
                  <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 font-display">Shipping Destination:</span>
                  <span className="block font-bold text-slate-855 dark:text-slate-100">{invoiceData.customer.name}</span>
                  <span className="block text-slate-500 leading-snug">
                    {invoiceData.customer.address.street}, {invoiceData.customer.address.city}, {invoiceData.customer.address.state} - {invoiceData.customer.address.zip}, {invoiceData.customer.address.country}
                  </span>
                </div>
              </div>

              {/* Items ledger */}
              <div className="border border-slate-200/50 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200/50 dark:border-slate-800">
                      <th className="p-3">Product Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item: any, idx: number) => (
                      <tr 
                        key={idx}
                        className="border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-250 bg-white dark:bg-slate-900"
                      >
                        <td className="p-3">
                          <span className="font-bold">{item.title}</span>
                          {item.variant && <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Variant: {item.variant}</span>}
                        </td>
                        <td className="p-3 text-center font-semibold">{item.quantity}</td>
                        <td className="p-3 text-right font-mono">₹{item.price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold">₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2 text-xs font-semibold">
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Tax Subtotal</span>
                    <span className="font-mono">₹{invoiceData.payment.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>GST / VAT (18% mock)</span>
                    <span className="font-mono">₹{invoiceData.payment.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white border-t border-slate-250 dark:border-slate-800 pt-2">
                    <span>Total Paid</span>
                    <span className="font-mono text-teal-600 dark:text-teal-400">₹{invoiceData.payment.total.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-[10px] text-slate-400 mt-1">
                    <span>Paid via: {invoiceData.payment.method} ({invoiceData.payment.status})</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
