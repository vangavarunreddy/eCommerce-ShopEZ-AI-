import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { Product, Order } from "../../types";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  FolderHeart,
  Settings,
  X,
  Truck,
  CheckCircle,
  BarChart3,
  IndianRupee
} from "lucide-react";

export const SellerDashboard: React.FC<{ onNavigate: (view: string, arg?: string) => void }> = ({ onNavigate }) => {
  const { user, showToast, refreshUserContext } = useApp();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States (Add/Edit Product)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [stock, setStock] = useState("");
  const [variantsStr, setVariantsStr] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // AI Seller Insights
  const [aiInsights, setAiInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  const loadSellerData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("shopez_token");
      
      // Load products listed by this seller
      const prodRes = await fetch("/api/products/seller-catalog", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Load platform orders (filtered to show relevant orders in backend or frontend)
      const ordRes = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ordRes.ok) {
        const ordData: Order[] = await ordRes.json();
        // Seller views orders containing their products (or all orders if admin)
        if (user?.role === "ADMIN") {
          setOrders(ordData);
        } else {
          const sellerOrders = ordData.filter(o => 
            o.products.some(op => prodData.some((sp: Product) => sp.id === op.productId))
          );
          setOrders(sellerOrders);
        }
      }
    } catch (e) {
      console.error("Seller dashboard data load failure", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, [user]);

  // Request AI Insights from Gemini
  const handleLoadInsights = async () => {
    setLoadingInsights(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch("/api/ai/insights", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsights(data.analysis);
      } else {
        showToast("AI Insights model failed to respond.", "error");
      }
    } catch (e) {
      showToast("Error retrieving seller insights.", "error");
    } finally {
      setLoadingInsights(false);
    }
  };

  // Add/Edit Product Submission
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !price || !stock) {
      showToast("Please fill in all required product fields.", "error");
      return;
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0) {
      showToast("Please enter valid price and stock values.", "error");
      return;
    }

    setSubmittingProduct(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const url = editingProdId ? `/api/products/${editingProdId}` : "/api/products";
      const method = editingProdId ? "PUT" : "POST";

      const variants = variantsStr.split(",").map(v => v.trim()).filter(Boolean);
      const images = imgUrl.trim() ? [imgUrl.trim()] : undefined;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          price: priceNum,
          category,
          stock: stockNum,
          variants,
          images
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setModalOpen(false);
        resetForm();
        loadSellerData();
      } else {
        showToast(data.error || "Failed to save product.", "error");
      }
    } catch (err) {
      showToast("Network error saving product details.", "error");
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleEditClick = (p: Product) => {
    setEditingProdId(p.id);
    setTitle(p.title);
    setDescription(p.description);
    setPrice(String(p.price));
    setCategory(p.category);
    setStock(String(p.stock));
    setVariantsStr(p.variants.join(", "));
    setImgUrl(p.images[0] || "");
    setModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delist this product?")) return;
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        loadSellerData();
      } else {
        showToast(data.error || "Failed to delete product.", "error");
      }
    } catch (e) {
      showToast("Network error deleting product.", "error");
    }
  };

  const handleFulfillOrder = async (orderId: string, targetStatus: "SHIPPED" | "DELIVERED") => {
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        loadSellerData();
        refreshUserContext();
      } else {
        showToast(data.error || "Failed to update order status.", "error");
      }
    } catch (err) {
      showToast("Network error updating order status.", "error");
    }
  };

  const resetForm = () => {
    setEditingProdId(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setCategory("Electronics");
    setStock("");
    setVariantsStr("");
    setImgUrl("");
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.totalAmount : 0), 0);
  const lowStockProducts = products.filter(p => p.stock < 10);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight font-display">Seller Hub</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">List catalog stocks, manage inventory pipelines, fulfill customer orders, and generate AI reports.</p>
        </div>

        <button
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-teal-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Volume</span>
            <span className="text-xl font-bold font-mono">₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Catalog Size</span>
            <span className="text-xl font-bold font-mono">{products.length} Products</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Warnings</span>
            <span className={`text-xl font-bold font-mono ${lowStockProducts.length > 0 ? "text-rose-500" : ""}`}>
              {lowStockProducts.length} Items
            </span>
          </div>
        </div>

      </div>

      {/* TWO COLUMNS: PRODUCTS LIST & ORDERS FULFILLMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Product Management */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">My Product Inventory</h3>
          
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
              No products listed yet. Click 'Add Product' to start selling!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((p) => (
                <div 
                  key={p.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/30">
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs line-clamp-1">{p.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">₹{p.price.toFixed(2)} | Stock: <span className={p.stock < 10 ? "text-rose-500 font-bold" : ""}>{p.stock}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="p-1.5 text-slate-400 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      title="Delist Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive CSS Charts & Fulfillment */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Sales chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="w-4.5 h-4.5 text-teal-500" /> Weekly Sales Ticker
            </h3>

            {/* CSS graph */}
            <div className="h-32 flex items-end gap-3.5 pt-4 font-mono text-[9px] font-bold text-slate-400">
              {[
                { label: "Mon", val: 30, count: "₹300" },
                { label: "Tue", val: 55, count: "₹550" },
                { label: "Wed", val: 80, count: "₹800" },
                { label: "Thu", val: 40, count: "₹400" },
                { label: "Fri", val: 95, count: "₹950" },
                { label: "Sat", val: 65, count: "₹650" },
                { label: "Sun", val: 75, count: "₹750" }
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white dark:bg-slate-800 px-1 py-0.5 rounded text-[8px] absolute mb-14">
                    {bar.count}
                  </span>
                  <div 
                    className="w-full rounded-t-sm bg-gradient-to-t from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 transition-all" 
                    style={{ height: `${bar.val}%` }} 
                  />
                  <span>{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FULFILLMENTS LOG */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm tracking-tight border-l-4 border-teal-500 pl-3">Order Fulfillments</h3>
            {orders.length === 0 ? (
              <div className="text-center py-8 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                No orders pending fulfillment.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div 
                    key={o.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-4 rounded-xl space-y-3 shadow-sm text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-extrabold font-mono">ORD-{o.id.slice(-6).toUpperCase()}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-bold uppercase font-mono">{o.status}</span>
                    </div>

                    <div className="space-y-1">
                      {o.products.map((op, idx) => (
                        <div key={idx} className="flex justify-between font-medium">
                          <span>{op.title}</span>
                          <span className="font-mono">{op.quantity}x</span>
                        </div>
                      ))}
                    </div>

                    {/* Ship/Deliver Actions */}
                    {o.status === "PLACED" && (
                      <button
                        onClick={() => handleFulfillOrder(o.id, "SHIPPED")}
                        className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Truck className="w-4 h-4" /> Ship Package
                      </button>
                    )}
                    {o.status === "SHIPPED" && (
                      <button
                        onClick={() => handleFulfillOrder(o.id, "DELIVERED")}
                        className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <CheckCircle className="w-4 h-4" /> Mark Delivered
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* AI SELLER INSIGHTS PORTAL */}
      <section className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 dark:from-teal-950/20 dark:to-indigo-950/20 border border-teal-500/20 dark:border-teal-900/30 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">AI Retail Sales Insights</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Request Gemini LLM to scan store catalog performance, sales velocity, and inventory alerts</p>
            </div>
          </div>

          <button
            onClick={handleLoadInsights}
            disabled={loadingInsights}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
          >
            {loadingInsights ? "Calculating Analytics..." : "Generate AI Insights"}
          </button>
        </div>

        {aiInsights && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-2xl shadow-inner text-sm leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-250 whitespace-pre-wrap font-sans">
            {aiInsights}
          </div>
        )}
      </section>

      {/* ADD/EDIT PRODUCT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg mb-4">{editingProdId ? "Edit Product Specifications" : "List New Product Item"}</h3>
            
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-450 uppercase">Product Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Viper Pro Wireless Mouse"
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-450 uppercase">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe specifications, build materials, warranty details..."
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 p-3 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-450 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="99.99"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-450 uppercase">Stock units</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="25"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-450 uppercase">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-450 uppercase">Variants (Comma-split)</label>
                  <input
                    type="text"
                    value={variantsStr}
                    onChange={(e) => setVariantsStr(e.target.value)}
                    placeholder="Red, Blue, 8GB RAM"
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-450 uppercase">Product Display Image URL</label>
                <input
                  type="text"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submittingProduct}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white hover:shadow-lg hover:shadow-teal-500/25 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingProduct ? "Saving Specifications..." : "Commit Listing"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
