import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { Product } from "../../types";
import { 
  Sparkles, 
  ArrowRight, 
  Flame, 
  CheckCircle, 
  Tag, 
  Zap, 
  ThumbsUp,
  Cpu,
  ShoppingBag
} from "lucide-react";

interface HomeProps {
  onNavigate: (view: string, arg?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user, showToast, toggleWishlist, wishlist } = useApp();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [aiRecs, setAiRecs] = useState<Product[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 48, seconds: 35 });

  // 1. Mock Countdown Clock for Flash Sale
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 2, minutes: 0, seconds: 0 }; // reset
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Load Featured Products
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const res = await fetch("/api/public/featured-products");
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data);
        }
      } catch (e) {
        console.error("Featured products load failure", e);
      }
    };
    loadFeatured();
  }, []);

  // 3. Load AI Recommended Products (personalized context)
  useEffect(() => {
    const loadAiRecs = async () => {
      if (!user) return;
      setLoadingRecs(true);
      try {
        const token = localStorage.getItem("shopez_token");
        const res = await fetch("/api/ai/recommend", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Map recommended items
          const allRes = await fetch("/api/products");
          if (allRes.ok) {
            const allProducts: Product[] = await allRes.json();
            const recIds: string[] = data.recommendations.map((r: any) => r.productId);
            const matchedRecs = allProducts.filter(p => recIds.includes(p.id));
            // Annotate matched items with the AI reason
            const annotated = matchedRecs.map(p => {
              const recommendationObj = data.recommendations.find((r: any) => r.productId === p.id);
              return {
                ...p,
                aiReason: recommendationObj ? recommendationObj.reason : "Top Recommendation"
              };
            });
            setAiRecs(annotated);
          }
        }
      } catch (e) {
        console.error("AI recommendations fetch failure", e);
      } finally {
        setLoadingRecs(false);
      }
    };

    loadAiRecs();
  }, [user]);

  const handleQuickAdd = async (product: Product) => {
    if (!user) {
      showToast("Please sign in to add items to cart.", "error");
      onNavigate("login");
      return;
    }
    // Context API handles quick add
    onNavigate("product-detail", product.id);
  };

  const categoriesList = [
    { name: "Electronics", icon: Cpu, desc: "Smart gadgets, keyboards & ANC audio", color: "from-blue-500 to-cyan-500" },
    { name: "Footwear", icon: Flame, desc: "Lightweight running sneakers & casual shoes", color: "from-orange-500 to-rose-500" },
    { name: "Accessories", icon: Tag, desc: "Handcrafted bags & insulated hydrators", color: "from-purple-500 to-indigo-500" }
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      
      {/* A. HERO GLASSMORPHIC BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800">
        {/* Decorative dynamic background gradients */}
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-transparent to-indigo-500/20 z-0 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl px-8 py-14 sm:px-12 sm:py-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation Shopping
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight font-display bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Meet the E-Commerce Store Powered by Google Gemini AI
          </h2>
          <p className="text-base text-slate-300 max-w-xl leading-relaxed">
            ShopEZ AI bridges premium retail products with advanced conversational artificial intelligence. Chat, compare, summarize reviews, and search with images to unlock a personalized retail journey.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onNavigate("shop")}
              className="px-6 py-3 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-slate-950 font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <span>Explore Products Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("ai")}
              className="px-6 py-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
              <span>Talk to Shopping Advisor</span>
            </button>
          </div>
        </div>
      </section>

      {/* B. TOP CATEGORIES QUICK LINKS */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold tracking-tight border-l-4 border-teal-500 pl-3">
          Browse by Category
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                onClick={() => onNavigate("shop", cat.name)}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
              >
                {/* Microgradient hover visual */}
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${cat.color}`} />
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-1 transition-all" />
                </div>
                <h4 className="font-bold text-base">{cat.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* C. FLASH SALES WITH TICKING COUNTDOWN */}
      <section className="bg-gradient-to-br from-rose-500/10 to-transparent dark:from-rose-950/10 dark:to-transparent border border-rose-500/20 dark:border-rose-950/20 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white animate-pulse">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display">ShopEZ AI Flash Deals</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Exclusive AI-curated markdowns, changing daily</p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 font-mono text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
            <span className="text-rose-500 uppercase text-[10px] tracking-wider font-semibold mr-1.5">Ends in:</span>
            <span className="bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, "0")}</span>
            <span className="text-slate-400 animate-pulse">:</span>
            <span className="bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, "0")}</span>
            <span className="text-slate-400 animate-pulse">:</span>
            <span className="bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, "0")}</span>
          </div>
        </div>

        {/* Flash sale products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {featuredProducts.slice(0, 3).map((p) => {
            const isWishlisted = wishlist.some(item => item.id === p.id);
            const discountPrice = parseFloat((p.price * 0.85).toFixed(2)); // mock 15% flash sale discount
            return (
              <div 
                key={`${p.id}-flash`}
                className="relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 overflow-hidden group shadow-sm"
              >
                {/* Discount Tag */}
                <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black uppercase font-mono">
                  15% OFF
                </div>

                <div 
                  className="h-44 w-full bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={() => onNavigate("product-detail", p.id)}
                >
                  <img 
                    src={p.images[0]} 
                    alt={p.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono tracking-wider font-semibold">{p.category}</span>
                    <h4 
                      className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-teal-500 cursor-pointer line-clamp-1"
                      onClick={() => onNavigate("product-detail", p.id)}
                    >
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                  </div>

                  <div className="flex items-end justify-between pt-1">
                    <div>
                      <span className="text-xs text-slate-400 line-through mr-1.5">₹{p.price.toFixed(2)}</span>
                      <span className="text-base font-extrabold text-rose-500 font-mono">₹{discountPrice.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(p)}
                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* D. PERSONALIZED AI RECOMMENDED PRODUCTS FEED */}
      {user && (
        <section className="bg-gradient-to-r from-teal-500/5 via-indigo-500/5 to-transparent border border-teal-500/10 dark:border-teal-500/5 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
                <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-display">AI Recommended For You</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Personalized feeds analyzing your wishlist bookmarks & orders</p>
              </div>
            </div>
          </div>

          {loadingRecs ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-56 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : aiRecs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiRecs.map((p: any) => (
                <div 
                  key={`${p.id}-ai`}
                  className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden group shadow-sm hover:shadow transition-all relative"
                >
                  <div 
                    className="h-40 w-full bg-slate-100 overflow-hidden cursor-pointer"
                    onClick={() => onNavigate("product-detail", p.id)}
                  >
                    <img 
                      src={p.images[0]} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {/* AI Explain Reason Tag */}
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-bold mb-2">
                        💡 {p.aiReason || "Selected for you"}
                      </span>
                      <h4 
                        className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-teal-500 cursor-pointer line-clamp-1"
                        onClick={() => onNavigate("product-detail", p.id)}
                      >
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">{p.category} | {p.ratings} ⭐</p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">₹{p.price.toFixed(2)}</span>
                      <button
                        onClick={() => onNavigate("product-detail", p.id)}
                        className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <ThumbsUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Add products to your wishlist or make a purchase to activate custom Gemini AI recommendations!</p>
            </div>
          )}
        </section>
      )}

      {/* E. GENERAL CATALOG HIGHLIGHTS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight border-l-4 border-teal-500 pl-3">
            Trending Best Sellers
          </h3>
          <button 
            onClick={() => onNavigate("shop")}
            className="text-xs font-semibold text-teal-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View All Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {featuredProducts.map((p) => (
            <div 
              key={p.id}
              className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden group shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => onNavigate("product-detail", p.id)}
            >
              <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                <img 
                  src={p.images[0]} 
                  alt={p.title} 
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">{p.category}</span>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-teal-500 transition-colors line-clamp-1 mt-0.5">
                    {p.title}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-amber-500">★</span>
                    <span className="text-[10px] font-bold">{p.ratings}</span>
                    <span className="text-[10px] text-slate-400">({p.stock > 0 ? `${p.stock} left` : "Out of stock"})</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">₹{p.price.toFixed(2)}</span>
                  <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
