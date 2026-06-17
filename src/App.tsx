import React, { useState } from "react";
import { AppProvider, useApp } from "./components/AppContext";
import { AppLayout } from "./components/AppLayout";

// Sub-view Pages (E-Commerce Refactored Views)
import { Home } from "./components/views/Home";
import { Shop } from "./components/views/Shop";
import { ProductDetail } from "./components/views/ProductDetail";
import { Cart } from "./components/views/Cart";
import { Wishlist } from "./components/views/Wishlist";
import { OrdersList } from "./components/views/OrdersList";
import { AIAssistant } from "./components/views/AIAssistant";
import { SellerDashboard } from "./components/views/SellerDashboard";
import { Admin } from "./components/views/Admin";
import { Login } from "./components/views/Login";

const AppContent: React.FC = () => {
  const { user } = useApp();
  
  // Navigation view router
  const [currentView, setCurrentView] = useState<string>("home");
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const handleNavigation = (view: string, arg?: string) => {
    if (view === "product-detail" && arg) {
      setSelectedProductId(arg);
    }
    setCurrentView(view);
    // Smooth scroll back to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderActiveView = () => {
    switch (currentView) {
      case "home":
        return <Home onNavigate={handleNavigation} />;
      
      case "shop":
        return <Shop onNavigate={handleNavigation} />;

      case "product-detail":
        return (
          <ProductDetail
            productId={selectedProductId || "prod_1"}
            onBack={() => handleNavigation("shop")}
            onNavigate={handleNavigation}
          />
        );

      case "cart":
        return <Cart onNavigate={handleNavigation} />;

      case "wishlist":
        return <Wishlist onNavigate={handleNavigation} />;

      case "orders":
        return <OrdersList onNavigate={handleNavigation} />;

      case "ai":
        return <AIAssistant onNavigate={handleNavigation} />;

      case "seller-dashboard":
        if (user && (user.role === "SELLER" || user.role === "ADMIN")) {
          return <SellerDashboard onNavigate={handleNavigation} />;
        }
        return <Home onNavigate={handleNavigation} />;

      case "admin":
        if (user && user.role === "ADMIN") {
          return <Admin onNavigate={handleNavigation} />;
        }
        return <Home onNavigate={handleNavigation} />;

      case "login":
        return <Login onSuccess={() => handleNavigation("shop")} />;

      default:
        // 404 Fallback
        return (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 max-w-md mx-auto space-y-4 shadow-xl">
            <h3 className="text-4xl font-black text-rose-500 font-display">404</h3>
            <p className="font-bold text-lg">Shop Page Not Found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">The product category or detail panel page you requested does not exist in our catalog index.</p>
            <button
              onClick={() => handleNavigation("home")}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Return to Homepage
            </button>
          </div>
        );
    }
  };

  return (
    <AppLayout activeView={currentView} onNavigate={handleNavigation}>
      {renderActiveView()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
