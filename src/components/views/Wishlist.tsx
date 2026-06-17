import React from "react";
import { useApp } from "../AppContext";
import { Heart, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";

interface WishlistProps {
  onNavigate: (view: string, arg?: string) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({ onNavigate }) => {
  const { wishlist, toggleWishlist } = useApp();

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-10 max-w-md mx-auto space-y-4 shadow-sm animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
          <Heart className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-xl font-display">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Save items you like to monitor inventory status, review average ratings, or buy them later.</p>
        </div>
        <button
          onClick={() => onNavigate("shop")}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xl font-bold tracking-tight border-l-4 border-teal-500 pl-3">My Wishlist Bookmarks</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">You have bookmarked {wishlist.length} products to monitor.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {wishlist.map((p) => (
          <div
            key={p.id}
            onClick={() => onNavigate("product-detail", p.id)}
            className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden group shadow-sm hover:shadow-md transition-all relative cursor-pointer"
          >
            
            {/* Remove Bookmark Button */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent navigates
                toggleWishlist(p.id);
              }}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900 text-rose-500 shadow-sm"
              title="Remove bookmark"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Product Image */}
            <div className="h-40 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
            </div>

            {/* Content info */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">{p.category}</span>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-teal-500 transition-colors line-clamp-1 mt-0.5">
                  {p.title}
                </h4>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-amber-500 text-xs">★</span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">{p.ratings} / 5.0</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">${p.price.toFixed(2)}</span>
                <span className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500 hover:text-slate-950 text-teal-500 text-[9px] font-bold transition-all flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Buy Now
                </span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
