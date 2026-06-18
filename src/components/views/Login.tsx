import React, { useState } from "react";
import { useApp } from "../AppContext";
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  Send,
  Eye,
  Gift,
  Check
} from "lucide-react";

export const Login: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { login, showToast } = useApp();
  const [isRegistering, setIsRegistering] = useState(false);

  // Form parameters
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CUSTOMER");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("USA");

  const [loading, setLoading] = useState(false);

  // Forgot password parameters
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLink, setForgotLink] = useState("");

  // Verification parameters
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLink, setVerifyLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please fill in both email and password.", "error");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegistering 
        ? { name, email, password, role, phone, street, city, state, zip, country }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        if (isRegistering) {
          // Open email verification screen automatically
          setVerifyEmail(email);
          setVerifyLink(data.resetLink || `/verify-account?code=V-${Math.floor(100000 + Math.random() * 900000)}`);
          setVerifyOpen(true);
          login(data.user, data.token);
          onSuccess();
        } else {
          login(data.user, data.token);
          onSuccess();
        }
      } else {
        showToast(data.error || "Authentication failed.", "error");
      }
    } catch (err) {
      setLoading(false);
      showToast("Network connection error during sign-in.", "error");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setForgotLink(data.resetLink);
      } else {
        showToast(data.error || "Failed to request reset.", "error");
      }
    } catch (err) {
      showToast("Network error executing password reset.", "error");
    }
  };

  const handleVerifySimulator = () => {
    showToast("Email address verified successfully! Account is active.", "success");
    setVerifyOpen(false);
    setVerifyLink("");
  };

  const handleMockGoogleLogin = () => {
    showToast("Simulating secure Google OAuth 2.0 Sign In...", "info");
    // Simulate auto login John Doe
    setName("Alice Smith");
    setEmail("customer@shopez.com");
    setPassword("customer123");
    setIsRegistering(false);
    showToast("Loaded test credentials! Click 'Sign In' to proceed.", "success");
  };

  const handleMockAdminLogin = () => {
    showToast("Loading secure Admin credentials...", "info");
    setName("ShopEZ Admin Core");
    setEmail("admin@shopez.com");
    setPassword("admin123");
    setIsRegistering(false);
    showToast("Loaded Admin credentials! Click 'Sign In' to proceed.", "success");
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xl p-6 sm:p-8 space-y-6 animate-fade-in pb-12">
      
      {/* HEADER TITLE */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight font-display bg-gradient-to-r from-teal-500 to-indigo-500 bg-clip-text text-transparent">
          {isRegistering ? "Register Account" : "Access ShopEZ AI"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {isRegistering ? "Create your credentials for smart shopping" : "Welcome back! Access your customized profile feed"}
        </p>
      </div>

      {/* AUTO-FILL / GOOGLE OAUTH SIMULATOR */}
      {!verifyOpen && !forgotOpen && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleMockGoogleLogin}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-teal-500" />
            <span>Mock Customer</span>
          </button>
          <button
            type="button"
            onClick={handleMockAdminLogin}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Mock Admin</span>
          </button>
        </div>
      )}

      {/* CORE FORMS */}
      {!forgotOpen && !verifyOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          {isRegistering && (
            <div className="space-y-1">
              <label className="block text-slate-450 uppercase">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Alice Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-slate-450 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="alice@shopez.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-450 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 pl-10 pr-4 py-2.5 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {isRegistering && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-450 uppercase">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  >
                    <option value="CUSTOMER">Customer (Shop)</option>
                    <option value="SELLER">Merchant Seller</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-450 uppercase">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="+1-555-0100"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-2 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery info in registration to make checkout seamless */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Delivery Address</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="col-span-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 focus:outline-none text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 focus:outline-none text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </>
          )}

          {!isRegistering && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => { setForgotLink(""); setForgotOpen(true); }}
                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-bold"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-650 hover:to-indigo-700 text-white hover:shadow-lg hover:shadow-teal-500/25 font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Authenticating Session..." : isRegistering ? "Create ShopEZ Account" : "Sign In to Feed"}
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>
      )}

      {/* PASSWORD RESET SIMULATOR PANEL */}
      {forgotOpen && (
        <div className="space-y-4 animate-fade-in text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-850 dark:text-white font-bold border-b pb-2">
            <UserCheck className="w-5 h-5 text-teal-500" />
            <span>Simulate Forgot Password Reset</span>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-slate-400 uppercase">Registered Email</label>
              <input
                type="email"
                placeholder="E.g., customer@shopez.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-lg cursor-pointer"
              >
                Query Reset Token
              </button>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </form>

          {forgotLink && (
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl space-y-2 leading-relaxed">
              <p className="font-bold">✓ Simulated Reset Link Dispatched!</p>
              <p className="text-[10px]">Click this simulated redirection mock link to complete reset:</p>
              <button
                onClick={() => {
                  alert("Simulated reset completed successfully! Password reset to 'customer123'.");
                  setForgotOpen(false);
                }}
                className="text-[10px] bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-md font-bold mt-1 inline-flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Execute Mock Reset
              </button>
            </div>
          )}
        </div>
      )}

      {/* EMAIL VERIFICATION SIMULATOR PANEL */}
      {verifyOpen && (
        <div className="space-y-4 animate-fade-in text-xs font-semibold">
          <div className="flex items-center gap-2 text-slate-850 dark:text-white font-bold border-b pb-2">
            <Sparkles className="w-5 h-5 text-teal-500 animate-pulse" />
            <span>Verify Registration Email</span>
          </div>

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl space-y-2 leading-relaxed">
            <p className="font-bold">✓ Registration Completed!</p>
            <p className="text-[10px]">A simulated verification link has been printed for demo. Click the button to mock-activate your account:</p>
            <button
              onClick={handleVerifySimulator}
              className="text-[10px] bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 rounded-md font-bold mt-1 inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Verify Account Now
            </button>
          </div>
        </div>
      )}

      {/* SWITCH MODES */}
      {!forgotOpen && !verifyOpen && (
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          {isRegistering ? "Already have a registered account?" : "New to the platform?"}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-teal-600 dark:text-teal-400 hover:underline font-bold ml-1.5 cursor-pointer uppercase tracking-wider"
          >
            {isRegistering ? "Sign In Instead" : "Create Account"}
          </button>
        </div>
      )}

    </div>
  );
};
