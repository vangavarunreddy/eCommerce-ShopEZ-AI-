import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Product, UserCartItem, Announcement, UserAddress } from "../types";

interface CartItemWithProduct {
  productId: string;
  quantity: number;
  variant: string;
  product: Product;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  theme: "dark" | "light";
  toast: { message: string; type: "success" | "error" | "info" } | null;
  loading: boolean;
  cart: CartItemWithProduct[];
  wishlist: Product[];
  announcements: Announcement[];
  activeCoupon: { code: string; discountPercentage: number } | null;
  login: (userData: User, tokenStr: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
  refreshUserContext: () => Promise<void>;
  
  // Shopping Methods
  addToCart: (product: Product, quantity: number, variant: string) => Promise<void>;
  removeFromCart: (productId: string, variant: string) => Promise<void>;
  updateCartQty: (productId: string, variant: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  checkoutCart: (paymentMethod: "STRIPE" | "RAZORPAY" | "COD", shippingAddress: UserAddress) => Promise<boolean>;
  
  // Getters
  getCartSubtotal: () => number;
  getCartTotal: () => number;
  getDiscountAmount: () => number;
  getCartItemsCount: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItemWithProduct[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; discountPercentage: number } | null>(null);

  // 1. Initial State Hydration
  useEffect(() => {
    const savedToken = localStorage.getItem("shopez_token");
    const savedTheme = localStorage.getItem("shopez_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    fetchAnnouncements();

    if (savedToken) {
      setToken(savedToken);
      fetchUserAndCart(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Synchronize HTML elements with active theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.setItem("shopez_theme", theme);
  }, [theme]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/public/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (e) {
      console.error("Announcements fetch failure", e);
    }
  };

  const fetchUserAndCart = async (authToken: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Fetch cart details
        const cartRes = await fetch("/api/products/cart", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (cartRes.ok) {
          const cartData = await cartRes.json();
          setCart(cartData);
        }

        // Fetch wishlist details
        const wishlistRes = await fetch("/api/products/wishlist", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (wishlistRes.ok) {
          const wishlistData = await wishlistRes.json();
          setWishlist(wishlistData);
        }
      } else {
        logout();
      }
    } catch (e) {
      console.error("Auto-login context check failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserContext = async () => {
    const currentToken = token || localStorage.getItem("shopez_token");
    if (currentToken) {
      await fetchUserAndCart(currentToken);
    }
  };

  const login = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem("shopez_token", tokenStr);
    fetchUserAndCart(tokenStr);
    showToast(`Welcome back, ${userData.name}!`, "success");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setCart([]);
    setWishlist([]);
    setActiveCoupon(null);
    localStorage.removeItem("shopez_token");
    showToast("Logged out successfully.", "info");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  const clearToast = () => {
    setToast(null);
  };

  // -------------------------------------------------------------
  // Shopping Cart & Wishlist Actions
  // -------------------------------------------------------------

  const syncCartWithServer = async (updatedCartList: CartItemWithProduct[], authToken: string) => {
    try {
      const payload = updatedCartList.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variant: item.variant
      }));

      await fetch("/api/products/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ cart: payload })
      });
    } catch (e) {
      console.error("Failed to sync cart with database server.", e);
    }
  };

  const addToCart = async (product: Product, quantity: number, variant: string) => {
    if (!user) {
      showToast("Access Denied. Please sign in to build your shopping cart.", "error");
      return;
    }

    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return;

    let updatedCart = [...cart];
    const existingIdx = updatedCart.findIndex(
      (item) => item.productId === product.id && item.variant === variant
    );

    if (existingIdx >= 0) {
      const currentQty = updatedCart[existingIdx].quantity;
      if (product.stock < currentQty + quantity) {
        showToast(`Cannot add items. Only ${product.stock} units are currently in stock.`, "error");
        return;
      }
      updatedCart[existingIdx].quantity += quantity;
    } else {
      if (product.stock < quantity) {
        showToast(`Cannot add items. Only ${product.stock} units are currently in stock.`, "error");
        return;
      }
      updatedCart.push({
        productId: product.id,
        quantity,
        variant,
        product
      });
    }

    setCart(updatedCart);
    showToast(`Added ${quantity}x '${product.title}' to cart.`, "success");
    await syncCartWithServer(updatedCart, currentToken);
  };

  const removeFromCart = async (productId: string, variant: string) => {
    if (!user) return;
    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return;

    const updatedCart = cart.filter(
      (item) => !(item.productId === productId && item.variant === variant)
    );

    setCart(updatedCart);
    showToast("Removed product item from cart.", "info");
    await syncCartWithServer(updatedCart, currentToken);
  };

  const updateCartQty = async (productId: string, variant: string, quantity: number) => {
    if (!user || quantity <= 0) return;
    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return;

    const updatedCart = [...cart];
    const idx = updatedCart.findIndex(
      (item) => item.productId === productId && item.variant === variant
    );

    if (idx >= 0) {
      const product = updatedCart[idx].product;
      if (product.stock < quantity) {
        showToast(`Only ${product.stock} units are available in stock.`, "error");
        return;
      }
      updatedCart[idx].quantity = quantity;
      setCart(updatedCart);
      await syncCartWithServer(updatedCart, currentToken);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return;

    setCart([]);
    await syncCartWithServer([], currentToken);
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      showToast("Access Denied. Please sign in to bookmark wishlists.", "error");
      return;
    }

    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return;

    try {
      const res = await fetch("/api/products/wishlist/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ productId })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message, "success");
        
        // Refresh wishlist data
        const wishlistRes = await fetch("/api/products/wishlist", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (wishlistRes.ok) {
          const wlData = await wishlistRes.json();
          setWishlist(wlData);
        }
        
        // Sync local user context
        if (user) {
          setUser({ ...user, wishlist: data.wishlist });
        }
      }
    } catch (e) {
      showToast("Connection to wishlist service failed.", "error");
    }
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    if (!user) return false;
    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return false;

    try {
      const res = await fetch("/api/products/coupons/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveCoupon({
          code: data.coupon.code,
          discountPercentage: data.coupon.discountPercentage
        });
        showToast(data.message, "success");
        return true;
      } else {
        showToast(data.error || "Failed to apply coupon.", "error");
        return false;
      }
    } catch (e) {
      showToast("Failed to verify coupon with server.", "error");
      return false;
    }
  };

  const removeCoupon = () => {
    setActiveCoupon(null);
    showToast("Coupon removed.", "info");
  };

  const checkoutCart = async (
    paymentMethod: "STRIPE" | "RAZORPAY" | "COD",
    shippingAddress: UserAddress,
    externalPaid = false
  ): Promise<boolean> => {
    if (!user) return false;
    const currentToken = token || localStorage.getItem("shopez_token");
    if (!currentToken) return false;

    try {
      const orderProducts = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variant: item.variant
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          products: orderProducts,
          paymentMethod,
          shippingAddress,
          couponCode: activeCoupon?.code || null,
          externalPaid
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setCart([]); // Clear local cart
        setActiveCoupon(null); // Clear coupon
        await refreshUserContext(); // Refresh wallet balances
        return true;
      } else {
        showToast(data.error || "Checkout failed.", "error");
        return false;
      }
    } catch (e) {
      showToast("Failed to complete checkout processing.", "error");
      return false;
    }
  };

  // -------------------------------------------------------------
  // Calculator Getters
  // -------------------------------------------------------------
  const getCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getDiscountAmount = () => {
    if (!activeCoupon) return 0;
    const subtotal = getCartSubtotal();
    return subtotal * (activeCoupon.discountPercentage / 100);
  };

  const getCartTotal = () => {
    const subtotal = getCartSubtotal();
    const discount = getDiscountAmount();
    return parseFloat((subtotal - discount).toFixed(2));
  };

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        theme,
        toast,
        loading,
        cart,
        wishlist,
        announcements,
        activeCoupon,
        login,
        logout,
        toggleTheme,
        showToast,
        clearToast,
        refreshUserContext,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        toggleWishlist,
        applyCoupon,
        removeCoupon,
        checkoutCart,
        getCartSubtotal,
        getCartTotal,
        getDiscountAmount,
        getCartItemsCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider node.");
  }
  return context;
};
