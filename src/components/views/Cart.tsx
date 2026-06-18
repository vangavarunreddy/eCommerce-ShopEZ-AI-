import React, { useState } from "react";
import { useApp } from "../AppContext";
import { 
  Trash2, 
  ShoppingCart, 
  Tag, 
  CreditCard, 
  MapPin, 
  ChevronRight, 
  ArrowLeft,
  X,
  Lock,
  Gift
} from "lucide-react";

interface CartProps {
  onNavigate: (view: string, arg?: string) => void;
}

export const Cart: React.FC<CartProps> = ({ onNavigate }) => {
  const { 
    user, 
    cart, 
    removeFromCart, 
    updateCartQty, 
    clearCart, 
    activeCoupon, 
    applyCoupon, 
    removeCoupon, 
    getCartSubtotal, 
    getCartTotal, 
    getDiscountAmount,
    checkoutCart
  } = useApp();

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"STRIPE" | "RAZORPAY" | "COD">("COD");

  // Shipping Address Form
  const [street, setStreet] = useState(user?.address.street || "");
  const [city, setCity] = useState(user?.address.city || "");
  const [state, setState] = useState(user?.address.state || "");
  const [zip, setZip] = useState(user?.address.zip || "");
  const [country, setCountry] = useState(user?.address.country || "USA");

  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Razorpay Payment Simulation States
  const [razorpaySimOpen, setRazorpaySimOpen] = useState(false);
  const [razorpayTab, setRazorpayTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [razorpaySimLoading, setRazorpaySimLoading] = useState(false);
  const [simCardNumber, setSimCardNumber] = useState("");
  const [simCardExpiry, setSimCardExpiry] = useState("");
  const [simCardCvv, setSimCardCvv] = useState("");
  const [simUpiId, setSimUpiId] = useState("");

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const success = await applyCoupon(couponCodeInput);
    if (success) {
      setCouponCodeInput("");
    }
  };

  const saveAddress = async () => {
    try {
      const token = localStorage.getItem("shopez_token");
      await fetch("/api/auth/profile/address", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ street, city, state, zip, country })
      });
    } catch (err) {
      console.error("Failed to automatically save default delivery profiles.", err);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!street || !city || !state || !zip || !country) {
      alert("Please provide complete shipping address details before checkout.");
      return;
    }

    const address = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim()
    };

    if (paymentMethod === "RAZORPAY") {
      setSubmittingCheckout(true);
      try {
        const token = localStorage.getItem("shopez_token");
        const orderRes = await fetch("/api/orders/razorpay-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ amount: getCartTotal() })
        });

        if (!orderRes.ok) {
          const errData = await orderRes.json();
          alert(errData.error || "Failed to create Razorpay order.");
          setSubmittingCheckout(false);
          return;
        }

        const orderData = await orderRes.json();
        setSubmittingCheckout(false);

        if (orderData.simulated) {
          // Open custom simulation modal
          setRazorpaySimOpen(true);
        } else {
          // Load real Razorpay checkout
          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: "INR",
            name: "ShopEZ AI",
            description: "Platform Smart Checkout Payment",
            order_id: orderData.orderId,
            handler: async function (response: any) {
              setSubmittingCheckout(true);
              const verifyRes = await fetch("/api/orders/razorpay-verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (verifyRes.ok) {
                const success = await checkoutCart("RAZORPAY", address, true);
                if (success) {
                  await saveAddress();
                  onNavigate("orders");
                }
              } else {
                alert("Razorpay signature validation failed.");
              }
              setSubmittingCheckout(false);
            },
            prefill: {
              name: user?.name || "",
              email: user?.email || "",
              contact: user?.phone || ""
            },
            theme: {
              color: "#14b8a6"
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      } catch (err) {
        console.error("Razorpay setup failed", err);
        alert("Payment gateway connection error.");
        setSubmittingCheckout(false);
      }
      return;
    }

    setSubmittingCheckout(true);
    const success = await checkoutCart(paymentMethod, address);
    setSubmittingCheckout(false);
    if (success) {
      await saveAddress();
      onNavigate("orders");
    }
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-10 max-w-md mx-auto space-y-5 shadow-sm animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-extrabold text-xl font-display">Your Cart is Empty</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Build your shopping cart with high-quality electronics, accessories, or footwear from our catalog.</p>
        </div>
        <button
          onClick={() => onNavigate("shop")}
          className="px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Go Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-12">
      
      {/* LEFT COLUMN: LIST OF CART ITEMS */}
      <div className="lg:col-span-2 space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h2 className="text-xl font-bold tracking-tight border-l-4 border-teal-500 pl-3">Shopping Cart</h2>
          <button
            onClick={clearCart}
            className="text-xs text-rose-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Empty Cart
          </button>
        </div>

        <div className="space-y-4">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variant}`}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm gap-4"
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50 dark:border-slate-800/50 cursor-pointer"
                  onClick={() => onNavigate("product-detail", item.productId)}
                >
                  <img src={item.product.images[0]} alt={item.product.title} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 
                    className="font-bold text-sm text-slate-850 dark:text-slate-100 hover:text-teal-500 cursor-pointer line-clamp-1"
                    onClick={() => onNavigate("product-detail", item.productId)}
                  >
                    {item.product.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Category: {item.product.category}</p>
                  {item.variant && (
                    <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-bold">
                      Variant: {item.variant}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                
                {/* Quantity Controls */}
                <div className="flex items-center border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 text-xs">
                  <button
                    onClick={() => updateCartQty(item.productId, item.variant, item.quantity - 1)}
                    className="px-2 py-1 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 font-mono font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQty(item.productId, item.variant, item.quantity + 1)}
                    className="px-2 py-1 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Subtotal Item Cost */}
                <div className="text-right">
                  <span className="block font-bold font-mono text-sm">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">₹{item.product.price.toFixed(2)} each</span>
                </div>

                {/* Trash Delete */}
                <button
                  onClick={() => removeFromCart(item.productId, item.variant)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>
            </div>
          ))}
        </div>

        {/* SHIPPING ADDRESS COLLECTOR FORM */}
        <form onSubmit={handleCheckout} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-teal-500" /> Delivery Shipping Details
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">Street Address</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="E.g., 123 Smart Alley"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="E.g., Tech City"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="E.g., Silicon"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">Postal ZIP Code</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="E.g., 94016"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-455">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="E.g., USA"
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                required
              />
            </div>
          </div>
        </form>

      </div>

      {/* RIGHT COLUMN: SUMMARY & CHECKOUT TRIGGERS */}
      <div className="space-y-6">
        
        {/* ORDER SUMMARY */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-6">
          <h3 className="font-bold text-sm tracking-tight border-b border-slate-100 dark:border-slate-800 pb-3">Order Summary</h3>

          <div className="space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Items Subtotal</span>
              <span className="font-mono">₹{getCartSubtotal().toFixed(2)}</span>
            </div>
            
            {activeCoupon && (
              <div className="flex justify-between text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-1 rounded">
                <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Code: {activeCoupon.code} (-{activeCoupon.discountPercentage}%)</span>
                <span className="font-mono">-₹{getDiscountAmount().toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Estimated Delivery</span>
              <span className="text-emerald-500">FREE</span>
            </div>

            <div className="flex justify-between text-base font-extrabold border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-900 dark:text-white">
              <span>Total Cost</span>
              <span className="font-mono">₹{getCartTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Coupon Code Input */}
          {!activeCoupon ? (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Apply Coupon (e.g. SHOPEZAI20)"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 uppercase font-semibold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0"
              >
                Apply
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between border border-teal-500/20 bg-teal-500/5 p-2 rounded-xl text-xs">
              <span className="font-bold text-teal-600 dark:text-teal-400">Code '{activeCoupon.code}' Active!</span>
              <button
                onClick={removeCoupon}
                className="text-rose-500 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Payment Gateway</label>
            
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "COD", label: "Cash On Delivery (COD)", desc: "Pay with cash on parcel delivery" },
                { id: "STRIPE", label: "Credit Card (Stripe)", desc: "Authorize mock secure card transactions" },
                { id: "RAZORPAY", label: "UPI & NetBanking (Razorpay)", desc: "Pay with virtual QR/UPI codes" }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === opt.id
                      ? "bg-teal-500/10 border-teal-500 text-slate-900 dark:text-white"
                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={opt.id}
                    checked={paymentMethod === opt.id}
                    onChange={() => setPaymentMethod(opt.id as any)}
                    className="mt-1 accent-teal-500"
                  />
                  <div>
                    <span className="block font-bold text-xs">{opt.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Place Order Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={submittingCheckout}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-teal-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            <Lock className="w-4 h-4" />
            {submittingCheckout ? "Processing checkout order..." : `Place Order (₹${getCartTotal().toFixed(2)})`}
          </button>

          <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 leading-none font-semibold">
            <Lock className="w-3 h-3 text-slate-400" /> Fully secured SSL end-to-end checkout encryption.
          </p>

        </div>

      </div>

      {/* RAZORPAY SIMULATION GATEWAY MODAL */}
      {razorpaySimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden relative">
            
            {/* Header: Razorpay themed banner */}
            <div className="bg-indigo-700 text-white p-5 space-y-1 relative">
              <button
                type="button"
                onClick={() => setRazorpaySimOpen(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-white text-indigo-700 font-black text-xs px-2 py-0.5 rounded italic">
                  Razorpay
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Secure Checkout</span>
              </div>
              <h3 className="font-extrabold text-base">ShopEZ AI Smart Retailer</h3>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-[11px] opacity-80">Order Amount:</span>
                <span className="text-xl font-bold font-mono">
                  ₹{Math.round(getCartTotal()).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Simulated Payment Option Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setRazorpayTab("upi")}
                className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
                  razorpayTab === "upi"
                    ? "border-indigo-650 text-indigo-600 dark:text-indigo-400 font-extrabold"
                    : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                UPI QR Code
              </button>
              <button
                type="button"
                onClick={() => setRazorpayTab("card")}
                className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
                  razorpayTab === "card"
                    ? "border-indigo-650 text-indigo-600 dark:text-indigo-400 font-extrabold"
                    : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                Cards (Credit/Debit)
              </button>
              <button
                type="button"
                onClick={() => setRazorpayTab("netbanking")}
                className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 ${
                  razorpayTab === "netbanking"
                    ? "border-indigo-650 text-indigo-600 dark:text-indigo-400 font-extrabold"
                    : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                Net Banking
              </button>
            </div>

            {/* Tab contents */}
            <div className="p-6 text-xs font-semibold space-y-4 text-slate-900 dark:text-white">
              
              {/* TAB 1: UPI */}
              {razorpayTab === "upi" && (
                <div className="space-y-4 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Scan QR code with your UPI app (GPay, PhonePe, Paytm) to complete payment instantly:</p>
                  
                  {/* Generated QR Code Container */}
                  <div className="w-40 h-40 border border-slate-200 dark:border-slate-800 rounded-xl mx-auto flex items-center justify-center p-2 bg-[#1b1c1e] relative group">
                    <img 
                      src="/phonepe_qr.png" 
                      alt="UPI Payment QR Code" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 uppercase text-[9px]">Or Enter UPI Virtual Address (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. buyer@upi"
                      value={simUpiId}
                      onChange={(e) => setSimUpiId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-center text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: CARDS */}
              {razorpayTab === "card" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-slate-400 uppercase text-[9px]">Card Number</label>
                    <input
                      type="text"
                      placeholder="4381 2900 1200 4882"
                      value={simCardNumber}
                      onChange={(e) => setSimCardNumber(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-slate-400 uppercase text-[9px]">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={simCardExpiry}
                        onChange={(e) => setSimCardExpiry(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-400 uppercase text-[9px]">CVV Code</label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={simCardCvv}
                        onChange={(e) => setSimCardCvv(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NET BANKING */}
              {razorpayTab === "netbanking" && (
                <div className="space-y-3">
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Select your standard banking portal to authorize payment:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => alert(`Simulated redirecting to ${bank} Secure Gateway portal...`)}
                        className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-200 dark:border-slate-800 rounded-lg text-left text-[10px] font-bold text-slate-700 dark:text-slate-350 transition-colors cursor-pointer truncate"
                      >
                        🏦 {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    setRazorpaySimLoading(true);
                    setTimeout(async () => {
                      try {
                        const token = localStorage.getItem("shopez_token");
                        const verifyRes = await fetch("/api/orders/razorpay-verify", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            razorpay_order_id: `order_sim_${Math.random().toString(36).substr(2, 9)}`,
                            razorpay_payment_id: `pay_sim_${Math.random().toString(36).substr(2, 9)}`,
                            razorpay_signature: "simulated_signature"
                          })
                        });

                        if (verifyRes.ok) {
                          const address = {
                            street: street.trim(),
                            city: city.trim(),
                            state: state.trim(),
                            zip: zip.trim(),
                            country: country.trim()
                          };
                          const success = await checkoutCart("RAZORPAY", address, true);
                          setRazorpaySimLoading(false);
                          if (success) {
                            setRazorpaySimOpen(false);
                            await saveAddress();
                            onNavigate("orders");
                          }
                        } else {
                          alert("Simulated signature verify failed.");
                          setRazorpaySimLoading(false);
                        }
                      } catch (e) {
                        alert("Network error processing payment checkout.");
                        setRazorpaySimLoading(false);
                      }
                    }, 1200);
                  }}
                  disabled={razorpaySimLoading}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-teal-500/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {razorpaySimLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying Payment Signature...
                    </span>
                  ) : (
                    "Simulate Successful Payment Checkout"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRazorpaySimOpen(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold rounded-xl text-center cursor-pointer transition-colors"
                >
                  Cancel Order Payment
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
