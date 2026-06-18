import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { Product, Review } from "../../types";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart, 
  Star, 
  Sparkles, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Zap,
  Info
} from "lucide-react";

interface ProductDetailProps {
  productId: string;
  onBack: () => void;
  onNavigate: (view: string, arg?: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onBack, onNavigate }) => {
  const { user, addToCart, toggleWishlist, wishlist, showToast } = useApp();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector States
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);

  // AI Review Summary States
  const [aiSummary, setAiSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // New Review Form States
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load product details, reviews, and related catalog items
  useEffect(() => {
    const loadProductData = async () => {
      setLoading(true);
      setAiSummary(""); // clear old summaries
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          setReviews(data.reviews);
          setRelatedProducts(data.related);
          
          // Select default variant if available
          if (data.product.variants && data.product.variants.length > 0) {
            setSelectedVariant(data.product.variants[0]);
          } else {
            setSelectedVariant("");
          }
          setActiveImageIdx(0);
          setQuantity(1);
        } else {
          showToast("Failed to load product details.", "error");
          onBack();
        }
      } catch (e) {
        console.error("Failed to load product details", e);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  // Request AI Review Summary from Gemini API
  const handleSummarizeReviews = async () => {
    if (reviews.length === 0) return;
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/ai/summarize-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      } else {
        showToast("AI Summarizer failed to connect.", "error");
      }
    } catch (e) {
      showToast("Error generating AI reviews summary.", "error");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Submit Customer Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Please sign in to submit a review.", "error");
      onNavigate("login");
      return;
    }

    if (!newComment.trim()) {
      showToast("Review comment cannot be empty.", "error");
      return;
    }

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("shopez_token");
      const res = await fetch(`/api/products/${productId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rating: newRating, comment: newComment })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setReviews([data.review, ...reviews]);
        setNewComment("");
        // Reload product details to update rating average
        const prodRes = await fetch(`/api/products/${productId}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProduct(prodData.product);
        }
      } else {
        showToast(data.error || "Failed to submit review.", "error");
      }
    } catch (err) {
      showToast("Network error submitting review.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, selectedVariant);
  };

  const handleBuyNow = async () => {
    if (!product) return;
    // Add to cart and immediately open Cart checkout
    await addToCart(product, quantity, selectedVariant);
    onNavigate("cart");
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
            <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const isWishlisted = wishlist.some(item => item.id === product.id);

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      
      {/* 1. BACK BUTTON */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </button>
      </div>

      {/* 2. PRODUCT MAIN OVERVIEW (IMAGE + SPECS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* A. PRODUCT IMAGES PANEL */}
        <div className="space-y-4">
          <div className="h-96 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden relative shadow-sm">
            <img
              src={product.images[activeImageIdx]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 bg-white dark:bg-slate-900 cursor-pointer ${
                    activeImageIdx === idx ? "border-teal-500" : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* B. PRODUCT DETAILS SPECIFICATION PANEL */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest font-mono">{product.category}</span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-1 leading-tight font-display">{product.title}</h2>
            
            <div className="flex items-center gap-4 mt-2.5">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold">{product.ratings} / 5.0</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{reviews.length} Customer Reviews</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className={`text-xs font-bold ${product.stock > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {product.stock > 0 ? `In Stock (${product.stock} left)` : "Sold Out"}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 border-t border-b border-slate-200/50 dark:border-slate-800/50 py-4">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">₹{product.price.toFixed(2)}</span>
            <span className="text-xs text-slate-400">excluding delivery charges</span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{product.description}</p>

          {/* Product Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Select Variant</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      selectedVariant === v
                        ? "bg-teal-500 border-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity and Actions */}
          {product.stock > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Qty</label>
                  <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-1.5 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 font-mono font-bold text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-1.5 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-transparent">Actions</span>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/15 transition-all cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to Cart
                    </button>
                    <button
                      onClick={handleBuyNow}
                      className="flex-1 py-3 bg-slate-900 dark:bg-slate-850 hover:bg-teal-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" /> Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl font-semibold text-xs flex items-center gap-2">
              <Info className="w-4.5 h-4.5" /> This product is currently sold out. Check back later or bookmark it.
            </div>
          )}

          {/* Bookmark Wishlist */}
          {user && (
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isWishlisted
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-500"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? "fill-rose-500" : ""}`} />
              <span>{isWishlisted ? "Bookmarked in Wishlist" : "Add to Wishlist Bookmark"}</span>
            </button>
          )}

          {/* Delivery badges */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-teal-500" /> Free Shipping
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-teal-500" /> 30-Day Returns
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" /> Secured Payment
            </div>
          </div>

        </div>

      </div>

      {/* 3. AI REVIEWS SUMMARIZER WIDGET */}
      {reviews.length > 0 && (
        <section className="bg-gradient-to-r from-teal-500/10 to-indigo-500/10 dark:from-teal-950/20 dark:to-indigo-950/20 border border-teal-500/20 dark:border-teal-900/30 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display">AI Customer Feedback Summarizer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Leverage Gemini LLM to synthesize thousands of client reviews into clear consensus data</p>
              </div>
            </div>

            <button
              onClick={handleSummarizeReviews}
              disabled={loadingSummary}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
            >
              {loadingSummary ? "Analyzing Reviews..." : "Summarize Feedback"}
            </button>
          </div>

          {aiSummary && (
            <div className="prose prose-sm dark:prose-invert max-w-none bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-2xl shadow-inner text-sm leading-relaxed overflow-x-auto">
              <div className="text-slate-800 dark:text-slate-250 whitespace-pre-wrap font-sans">
                {aiSummary}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. REVIEWS LISTING & SUBMIT FORM */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-200 dark:border-slate-800 pt-8">
        
        {/* REVIEW CREATOR */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-bold text-lg border-l-4 border-teal-500 pl-3">Add Your Feedback</h3>
          {user ? (
            <form onSubmit={handleSubmitReview} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Your Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      type="button"
                      onClick={() => setNewRating(stars)}
                      className="p-0.5 cursor-pointer"
                    >
                      <Star 
                        className={`w-5 h-5 ${
                          stars <= newRating 
                            ? "fill-amber-400 text-amber-400" 
                            : "text-slate-300 dark:text-slate-700"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Your Review</label>
                <textarea
                  rows={4}
                  placeholder="Share details of your experience with this product..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-all"
              >
                {submittingReview ? "Posting Review..." : "Submit Review"}
              </button>
            </form>
          ) : (
            <div className="p-5 bg-slate-100 dark:bg-slate-900 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Sign in to share your product experience with other buyers.</p>
              <button
                onClick={() => onNavigate("login")}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* FEEDBACK FEED */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-lg border-l-4 border-teal-500 pl-3">Customer Reviews</h3>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div 
                  key={r.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 p-5 rounded-2xl shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs">{r.userName}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-3 h-3 ${
                            s <= r.rating 
                              ? "fill-amber-400 text-amber-400" 
                              : "text-slate-200 dark:text-slate-800"
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-sans">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white dark:bg-slate-900 border border-dashed border-slate-250 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
              No review records yet. Be the first to share your opinion!
            </div>
          )}
        </div>

      </section>

      {/* 5. RELATED PRODUCTS GRID */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 border-t border-slate-200 dark:border-slate-800 pt-8">
          <h3 className="font-bold text-lg border-l-4 border-teal-500 pl-3">Related Products</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate("product-detail", p.id)}
                className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 overflow-hidden group shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <div className="h-36 w-full bg-slate-100 dark:bg-slate-850 overflow-hidden relative">
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-teal-500 line-clamp-1">{p.title}</h4>
                    <span className="text-[9px] text-slate-400 font-mono">{p.category} | {p.ratings} ★</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">₹{p.price.toFixed(2)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
