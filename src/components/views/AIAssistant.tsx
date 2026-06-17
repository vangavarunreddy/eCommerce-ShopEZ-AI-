import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../AppContext";
import { Product, ChatMessage } from "../../types";
import { 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  ArrowRight, 
  Scale, 
  MessageSquare, 
  Info,
  CheckCircle,
  HelpCircle,
  X
} from "lucide-react";

export const AIAssistant: React.FC<{ onNavigate?: (view: string, arg?: string) => void }> = ({ onNavigate }) => {
  const { showToast } = useApp();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "##### 🛍️ ShopEZ AI Shopping Advisor\n\nWelcome! I am your professional retail assistant. Ask me questions about our product catalog, specifications, or inventory. \n\nYou can also:\n- **Compare Products** using the spec builder on the right.\n- **Voice Search** by clicking the microphone.\n- **Image Search** by selecting pre-defined sample pictures below!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Catalog items for comparison selector
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [prodIdA, setProdIdA] = useState("");
  const [prodIdB, setProdIdB] = useState("");
  const [comparing, setComparing] = useState(false);

  // Voice Search States
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);

  // Image search popup states
  const [imagePopupOpen, setImagePopupOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load catalog list and initialize voice recognition API
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
          if (data.length >= 2) {
            setProdIdA(data[0].id);
            setProdIdB(data[1].id);
          }
        }
      } catch (err) {
        console.error("Failed to load catalog.", err);
      }
    };
    loadCatalog();

    // HTML5 SpeechRecognition setup
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsRecording(true);
        showToast("Voice listening... Speak now.", "info");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        showToast(`Captured: "${transcript}"`, "success");
      };

      rec.onerror = () => {
        showToast("Speech recognition error. Please check mic inputs.", "error");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleSendChat = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    if (!textToSend) setInputText("");

    // Append User Message
    const userMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setSendingChat(true);

    try {
      const chatHistory = messages.map(m => ({ sender: m.sender, text: m.text }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, chatHistory })
      });

      const data = await res.json();
      if (res.ok) {
        const aiMsg: ChatMessage = {
          id: "msg_" + Math.random().toString(36).substr(2, 9),
          sender: "ai",
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        showToast(data.error || "Failed to query chat advisor.", "error");
      }
    } catch (e) {
      showToast("Network failure querying Shopping Advisor.", "error");
    } finally {
      setSendingChat(false);
    }
  };

  // Trigger voice recording or toggle mock speech commands if mic unsupported
  const handleToggleVoice = () => {
    if (recognition) {
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    } else {
      // Mock Voice Search triggers
      const mockQueries = [
        "Find mechanical keyboard",
        "Compare smart watch and satchel",
        "Show premium earbuds",
        "Is there any flash sale running?"
      ];
      const selected = mockQueries[Math.floor(Math.random() * mockQueries.length)];
      setInputText(selected);
      showToast(`Mic API unsupported. Simulated voice: "${selected}"`, "info");
    }
  };

  // AI Image Search Trigger
  const handleSelectSampleImage = async (sampleId: string) => {
    setImagePopupOpen(false);
    
    // 1. Append Image Search User Bubbles
    const friendlyName = sampleId.replace("sample_", "").toUpperCase();
    const userMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: `[Visual Image Search]: Uploaded photo of a ${friendlyName}. Search visual similarities.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setSendingChat(true);

    try {
      const res = await fetch("/api/ai/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleImageId: sampleId })
      });

      const data = await res.json();
      if (res.ok) {
        // Construct markdown detailing visual match results
        let replyText = `##### 📷 Image Matching Analysis:\n\n${data.message}\n\n`;
        if (data.products && data.products.length > 0) {
          replyText += `Here are the matching **${data.category}** items I found in our warehouse:\n\n`;
          data.products.forEach((p: Product) => {
            replyText += `- **${p.title}** ($${p.price.toFixed(2)}) — Rated ${p.ratings} ⭐\n`;
          });
          replyText += `\n*Double-click product titles inside the Shop grid to buy!*`;
        } else {
          replyText += `No visually matching items were found in catalog stocks.`;
        }

        const aiMsg: ChatMessage = {
          id: "msg_" + Math.random().toString(36).substr(2, 9),
          sender: "ai",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        showToast(data.error || "Image classification failed.", "error");
      }
    } catch (e) {
      showToast("Network failure matching visual images.", "error");
    } finally {
      setSendingChat(false);
    }
  };

  // Compare Product Form Submit
  const handleBuildComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodIdA || !prodIdB) return;
    if (prodIdA === prodIdB) {
      showToast("Please select two different products to compare.", "error");
      return;
    }

    setComparing(true);
    // Append comparing user bubbles
    const titleA = catalog.find(c=>c.id === prodIdA)?.title || "Product A";
    const titleB = catalog.find(c=>c.id === prodIdB)?.title || "Product B";

    const userMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: `[Spec Comparison]: Compare side-by-side: '${titleA}' and '${titleB}' details.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [prodIdA, prodIdB] })
      });

      const data = await res.json();
      if (res.ok) {
        const aiMsg: ChatMessage = {
          id: "msg_" + Math.random().toString(36).substr(2, 9),
          sender: "ai",
          text: data.report,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          comparisonReport: true
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        showToast(data.error || "Comparison generator failed.", "error");
      }
    } catch (e) {
      showToast("Network failure generating comparisons.", "error");
    } finally {
      setComparing(false);
    }
  };

  const imageSamplesList = [
    { id: "sample_sneaker", label: "Sneaker Sport Shoes", icon: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop" },
    { id: "sample_earbuds", label: "Wireless Earbuds", icon: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format&fit=crop" },
    { id: "sample_keyboard", label: "Mechanical Keyboard", icon: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=100&auto=format&fit=crop" },
    { id: "sample_watch", label: "Health Tracker Watch", icon: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop" },
    { id: "sample_bag", label: "Leather Satchel Bag", icon: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&auto=format&fit=crop" },
    { id: "sample_flask", label: "Vacuum Insulated Bottle", icon: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=100&auto=format&fit=crop" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-12 h-[calc(100vh-12rem)] min-h-[500px]">
      
      {/* LEFT COLUMN: CHAT FEED CONTAINER */}
      <section className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl flex flex-col shadow-sm overflow-hidden h-full">
        
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 dark:from-violet-950/20 dark:to-fuchsia-950/20 px-5 py-4 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-slate-900 dark:text-white">ShopEZ AI Shopping Coach</h3>
              <p className="text-[9px] text-violet-600 dark:text-violet-400 font-extrabold uppercase tracking-wider font-mono">Gemini-3.5-Flash Active</p>
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div 
              key={m.id}
              className={`flex flex-col max-w-[85%] space-y-1 ${
                m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div 
                className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-tr-none shadow-sm"
                    : "bg-slate-50 dark:bg-slate-850 border border-slate-200/40 dark:border-slate-800/50 rounded-tl-none text-slate-800 dark:text-slate-200"
                } ${m.comparisonReport ? "w-full md:w-[480px] overflow-x-auto" : ""}`}
              >
                {/* Simple Markdown Renderer Mock */}
                <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert">
                  {m.text}
                </div>
              </div>
              <span className="text-[8px] text-slate-400 font-mono">{m.timestamp}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Inputs */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 shrink-0 space-y-3">
          
          {/* Quick Actions (Voice, Image) */}
          <div className="flex gap-2">
            <button
              onClick={handleToggleVoice}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                isRecording 
                  ? "bg-rose-500 text-white animate-pulse" 
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-500/50 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-850"
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-violet-500" />}
              <span>Voice Shop</span>
            </button>

            <button
              onClick={() => setImagePopupOpen(true)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:border-violet-500/50 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ImageIcon className="w-3.5 h-3.5 text-violet-500" />
              <span>Image Match</span>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about mechanical keyboards, best sellers, variant colors..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
              disabled={sendingChat}
            />
            <button
              onClick={() => handleSendChat()}
              disabled={sendingChat || !inputText.trim()}
              className="px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>

      </section>

      {/* RIGHT COLUMN: AI COMPARISON BUILDER */}
      <section className="lg:col-span-1 space-y-6">
        
        {/* Spec Comparison tool */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Scale className="w-5 h-5 text-violet-500" />
            <div>
              <h3 className="font-bold text-sm tracking-tight">AI Product Comparison</h3>
              <p className="text-[10px] text-slate-500">Pick two items to compare specs & reviews</p>
            </div>
          </div>

          {catalog.length >= 2 ? (
            <form onSubmit={handleBuildComparison} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-slate-450 uppercase">Product A</label>
                <select
                  value={prodIdA}
                  onChange={(e) => setProdIdA(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                >
                  {catalog.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{p.title} (${p.price})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-455 uppercase">Product B</label>
                <select
                  value={prodIdB}
                  onChange={(e) => setProdIdB(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500 text-slate-900 dark:text-white"
                >
                  {catalog.map(p => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{p.title} (${p.price})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={comparing}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white hover:shadow-lg hover:shadow-violet-500/25 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {comparing ? "Synthesizing Data..." : "Run Side-by-Side Analysis"}
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-400">Loading products database catalog...</p>
          )}
        </div>

        {/* Advisor Help hints */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm space-y-3 text-xs">
          <h4 className="font-bold flex items-center gap-1.5 text-slate-850 dark:text-white">
            <HelpCircle className="w-4 h-4 text-violet-500" /> Need Search Suggestions?
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Try clicking these quick phrases to trigger instant analyses from ShopEZ AI:</p>
          <div className="flex flex-col gap-1.5 font-medium">
            {[
              "Which smartwatch features heartbeat tracking?",
              "Recommend top accessories for professional coding office work.",
              "What variants does the lighter weight Aerotech shoe support?",
              "Are reviews for the Aura earbuds favorable?"
            ].map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(phrase)}
                className="text-left py-1 text-[10px] text-violet-650 dark:text-violet-400 hover:underline cursor-pointer"
              >
                ➔ "{phrase}"
              </button>
            ))}
          </div>
        </div>

      </section>

      {/* PRE-DEFINED SAMPLE IMAGES MODAL OVERLAY */}
      {imagePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 relative space-y-4">
            
            <button
              onClick={() => setImagePopupOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-extrabold text-base">Select Visual Search Sample</h3>
              <p className="text-xs text-slate-500">Click a predefined photo below to simulate uploading a product snapshot</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {imageSamplesList.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSampleImage(sample.id)}
                  className="bg-slate-50 dark:bg-slate-850 hover:bg-violet-500/10 border border-slate-200/50 dark:border-slate-800/80 p-2.5 rounded-xl cursor-pointer hover:border-violet-500 flex items-center gap-2.5 transition-all text-xs"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200/30 bg-white dark:bg-slate-900">
                    <img src={sample.icon} alt={sample.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold leading-tight">{sample.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
