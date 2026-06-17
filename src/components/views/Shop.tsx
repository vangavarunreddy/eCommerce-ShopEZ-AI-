import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { Product } from "../../types";
import { 
  Search, 
  SlidersHorizontal, 
  Star, 
  ArrowUpDown, 
  ShoppingBag,
  Heart,
  Grid,
  Sparkles
} from "lucide-react";

interface ShopProps {
  onNavigate: (view: string, arg?: string) => void;
}

export const Shop: React.FC<ShopProps> = ({ onNavigate }) => {
  const { user, toggleWishlist, wishlist, showToast } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortOrder, setSortOrder] = useState("newest");

  // Load Categories & Products
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        // Build query URL
        let url = `/api/products?sort=${sortOrder}`;
        if (selectedCategory && selectedCategory !== "All") {
          url += `&category=${encodeURIComponent(selectedCategory)}`;
        }
        if (searchTerm) {
          url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        if (minPrice) {
          url += `&minPrice=${minPrice}`;
        }
        if (maxPrice) {
          url += `&maxPrice=${maxPrice}`;
        }
        if (minRating > 0) {
          url += `&rating=${minRating}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }

        // Fetch categories list
        const catRes = await fetch("/api/products/categories");
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        }
      } catch (e) {
        console.error("Failed to load products list", e);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, selectedCategory, minPrice, maxPrice, minRating, sortOrder]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setMinRating(0);
    setSortOrder("newest");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. FILTERING TITLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight font-display">ShopEZ Catalog</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Discover premium items, analyzed and compared by AI shopping coaches.</p>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
          >
            <option value="newest">New Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Customer Rated</option>
          </select>
        </div>
      </div>

      {/* 2. MAIN GRID (LEFT SIDE FILTERS, RIGHT SIDE CARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* FILTERS PANEL */}
        <aside className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 h-fit space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-teal-500" /> Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-[10px] text-rose-500 hover:underline font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* A. Search Box */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Keyword Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* B. Category List */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* C. Price Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Price Range ($)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-mono text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-mono text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              className="w-full mt-2 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-650 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center hover:shadow-md hover:shadow-teal-500/10"
              onClick={() => {
                showToast("Applying price range filters...", "info");
              }}
            >
              Apply Price Range
            </button>
          </div>

          {/* D. Rating Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Minimum Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setMinRating(stars === minRating ? 0 : stars)}
                  className="p-1 cursor-pointer"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      stars <= minRating 
                        ? "fill-amber-400 text-amber-400" 
                        : "text-slate-300 dark:text-slate-700"
                    }`} 
                  />
                </button>
              ))}
              {minRating > 0 && <span className="text-[10px] text-slate-400 font-bold ml-1">{minRating}+ Stars</span>}
            </div>
          </div>
        </aside>

        {/* PRODUCTS CARDS CONTAINER */}
        <section className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p) => {
                const isWishlisted = wishlist.some(item => item.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden group shadow-sm hover:shadow-md transition-all relative cursor-pointer"
                    onClick={() => onNavigate("product-detail", p.id)}
                  >
                    
                    {/* Bookmark Wishlist Star Button */}
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent navigating to detail
                          toggleWishlist(p.id);
                        }}
                        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 text-slate-400 hover:text-rose-500 shadow-sm transition-all"
                        title={isWishlisted ? "Remove bookmark" : "Bookmark product"}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                      </button>
                    )}

                    {/* Image section */}
                    <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                    </div>

                    {/* Content section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">{p.category}</span>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-teal-500 transition-colors line-clamp-1 mt-0.5">
                          {p.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">{p.description}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold">{p.ratings} / 5.0</span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className="text-[10px] text-slate-400">{p.stock > 0 ? `${p.stock} units stock` : "Sold Out"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">${p.price.toFixed(2)}</span>
                        <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-slate-950 text-teal-500 text-[10px] font-bold transition-all flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" /> Details
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="font-bold">No Products Matched</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">We couldn't find any products fitting your current query and filters. Try adjusting your search criteria.</p>
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-xs font-bold rounded-xl cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </section>

      </div>

    </div>
  );
};
