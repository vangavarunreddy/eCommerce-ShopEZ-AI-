import express from "express";
import { GoogleGenAI } from "@google/genai";
import { db, Product, Review } from "./db";
import { requireAuth, requireSeller, AuthenticatedRequest } from "./auth";

const router = express.Router();

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

function isAIAvailable(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return !!key && key.startsWith("AIzaSy");
}

async function callGeminiWithTimeout<T>(apiCall: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    apiCall,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out")), timeoutMs)
    )
  ]);
}

// -------------------------------------------------------------
// 1. AI SHOPPING ASSISTANT CHATBOT
// -------------------------------------------------------------
router.post("/chat", async (req, res) => {
  try {
    const { message, chatHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing 'message' content." });
    }

    // Capture current store catalog for context
    const products = await db.getProducts();
    const catalogContext = products.map(
      (p) => `- ID: ${p.id}, Title: ${p.title}, Category: ${p.category}, Price: $${p.price}, Rating: ${p.ratings}/5, Stock: ${p.stock} units, Variants: ${p.variants.join(", ")}`
    ).join("\n");

    const systemPrompt = `You are "ShopEZ AI Professional Shopping Advisor", an elite shopping coach on the ShopEZ AI E-Commerce platform.
You are professional, polite, helpful, and highly knowledgeable about our product catalog.
You help customers find products, explain product details, check variants, compare features, and suggest perfect buys.
Always reference actual products in the store catalog below. Do not make up non-existent products.
If a customer shows interest, guide them on how to buy or recommend adding it to the cart/wishlist.

Here is our LIVE store catalog context:
${catalogContext}

Keep your responses structured, clear, and in pretty markdown format. If running offline, notice users about simulated support, but answer directly anyway.`;

    if (isAIAvailable()) {
      try {
        const ai = getGenAI();

        const contentsParts: any[] = [];
        if (Array.isArray(chatHistory)) {
          chatHistory.slice(-8).forEach((msg: any) => {
            contentsParts.push({
              role: msg.sender === "user" ? "user" : "model",
              parts: [{ text: msg.text }]
            });
          });
        }
        contentsParts.push({ role: "user", parts: [{ text: message }] });

        const response = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: contentsParts,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            }
          })
        );

        return res.json({ reply: response.text || "I apologize, but I could not formulate a response.", source: "gemini" });
      } catch (err: any) {
        console.warn("[Gemini API Warning] Chat request failed, falling back to local simulator:", err.message);
      }
    }

    // High-Fidelity Local Simulation Chatbot
    const input = message.toLowerCase();
    let reply = "##### 🛍️ ShopEZ AI Shopping Advisor (Offline Simulation Mode)\n\n";

    if (input.includes("keyboard") || input.includes("mechanical")) {
      const kb = products.find(p => p.title.toLowerCase().includes("keyboard"));
      reply += `The **Viper Pro Mech Wireless Keyboard** is available in our store for **$${kb?.price || 129.99}**.\n\n` +
        `- **Key Features:** Hot-swappable tactile brown switches, double-shot PBT keycaps, and customizable RGB backlighting.\n` +
        `- **Variants:** Carbon Black and Mercury White.\n` +
        `- **Stock:** ${kb?.stock || 45} units left.\n\n` +
        `Would you like me to compare this keyboard with other products, or help you add it to your cart?`;
    } else if (input.includes("earbud") || input.includes("headphone") || input.includes("sound")) {
      const eb = products.find(p => p.title.toLowerCase().includes("earbud"));
      reply += `We offer the premium **Aura Sound canceling Earbuds** for **$${eb?.price || 189.50}**.\n\n` +
        `- **Specs:** Adaptive ANC (Active Noise Cancellation), 11mm dynamic drivers, and 36-hour aggregate battery case capacity.\n` +
        `- **Colors:** Midnight Blue and Platinum Silver.\n\n` +
        `They are highly recommended for focus, study sessions, and workouts!`;
    } else if (input.includes("watch") || input.includes("smart watch")) {
      const watch = products.find(p => p.title.toLowerCase().includes("watch"));
      reply += `The **Apex Horizon Smart Watch Pro** retails at **$${watch?.price || 249.00}**.\n\n` +
        `- **Health Sensors:** Heart rate tracker, blood oxygen sensor (SpO2), active sleep monitoring, and dual-frequency GPS tracker.\n` +
        `- **Colors:** Titanium Gray and Rose Gold.\n` +
        `- **Battery:** Up to 14 days of standalone battery efficiency.\n\n` +
        `It's currently one of our best sellers for sports tracking!`;
    } else if (input.includes("bag") || input.includes("satchel") || input.includes("leather")) {
      reply += `Yes! The **Heritage Full-Grain Leather Satchel ($175.00)** is handcrafted from vegetable-tanned full-grain leather.\n\n` +
        `- Fits laptops up to 16 inches.\n` +
        `- Features heavy-duty brass buckles and a detachable padded shoulder harness.\n` +
        `It is the perfect choice for professional meetings and office travel.`;
    } else if (input.includes("recommend") || input.includes("suggest") || input.includes("best seller")) {
      reply += `Based on popular user ratings, here are my top recommendations:\n` +
        `1. **Heritage Full-Grain Leather Satchel** (4.9 ⭐) - Exquisite craftsmanship.\n` +
        `2. **Viper Pro Mech Wireless Keyboard** (4.8 ⭐) - Ultimate productivity tool.\n` +
        `3. **Apex Horizon Smart Watch Pro** (4.7 ⭐) - Professional health tracking.\n\n` +
        `Which category interest you the most? I can filter items or search by price!`;
    } else {
      reply += `Thank you for asking! I can help you find products, answer technical questions, compare specifications, and summarize user feedback.\n\n` +
        `Please ask me about our catalog items like the **Keyboard**, **Earbuds**, **Smartwatch**, or **Leather Satchel**. \n\n` +
        `*Note: The live API connection warning was triggered. Displaying local simulated response.*`;
    }

    return res.json({ reply, source: "simulation" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process chat enquiry." });
  }
});

// -------------------------------------------------------------
// 2. AI PRODUCT RECOMMENDATION ENGINE
// -------------------------------------------------------------
router.get("/recommend", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const products = await db.getProducts();
    const orders = await db.getOrders(user.id);

    // Context preparation: User behavior (wishlist, orders, cart)
    const wishlistTitles = products.filter(p => user.wishlist.includes(p.id)).map(p => p.title);
    const cartTitles = products.filter(p => user.cart.some(c => c.productId === p.id)).map(p => p.title);
    const pastPurchaseCategories = Array.from(new Set(orders.flatMap(o => o.products.map(p => p.productId))).map(id => {
      const p = products.find(prod => prod.id === id);
      return p ? p.category : "";
    }).filter(Boolean));

    const behaviorString = `
    User Name: ${user.name}
    Wishlist Items: [${wishlistTitles.join(", ")}]
    Cart Items: [${cartTitles.join(", ")}]
    Past Purchase Categories: [${pastPurchaseCategories.join(", ")}]
    `;

    const catalogString = products.map(p => `ID: ${p.id}, Title: ${p.title}, Category: ${p.category}, Price: $${p.price}, Rating: ${p.ratings}`).join("\n");

    const systemPrompt = `You are a Smart Product Recommender system for ShopEZ AI.
Analyze the user's behavior history:
${behaviorString}

From the store catalog, select the top 3 products that match their interests or complement their past behavior:
${catalogString}

Respond with a JSON block containing the recommended product IDs and short descriptions explaining why they were chosen.
Response format must be exact JSON:
{
  "recommendations": [
    { "productId": "prod_1", "reason": "We noticed your interest in electronics accessories..." }
  ]
}
Do not write markdown wraps except raw JSON code.`;

    if (isAIAvailable()) {
      try {
        const ai = getGenAI();
        const response = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Suggest products for this user.",
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.4,
              responseMimeType: "application/json"
            }
          })
        );

        const result = JSON.parse(response.text || "{}");
        return res.json(result);
      } catch (err: any) {
        console.warn("[Gemini API Warning] Recommend request failed, falling back to local simulator:", err.message);
      }
    }

    // Simulation fallback: return products that fit the categories
    const recommendations = [];
    if (user.wishlist.length > 0) {
      const firstId = user.wishlist[0];
      const match = products.find(p => p.id === firstId);
      if (match) {
        const related = products.find(p => p.category === match.category && p.id !== match.id);
        if (related) {
          recommendations.push({
            productId: related.id,
            reason: `Since you bookmarked the '${match.title}', you might enjoy this premium '${related.title}' from the same ${related.category} category.`
          });
        }
      }
    }

    // Default recommendations if list is short
    const defaultSuggestions = products.slice(0, 3);
    for (const p of defaultSuggestions) {
      if (recommendations.length < 3 && !recommendations.some(r => r.productId === p.id)) {
        recommendations.push({
          productId: p.id,
          reason: `Featured Top Seller: The highly-rated '${p.title}' (Rated ${p.ratings} ⭐) is trending on the ShopEZ platform this week.`
        });
      }
    }

    res.json({ recommendations });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load product recommendations." });
  }
});

// -------------------------------------------------------------
// 3. AI PRODUCT COMPARISON
// -------------------------------------------------------------
router.post("/compare", async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({ error: "Please select at least 2 products to compare." });
    }

    const products: Product[] = [];
    for (const id of productIds) {
      const p = await db.getProductById(id);
      if (p) products.push(p);
    }

    if (products.length < 2) {
      return res.status(404).json({ error: "Matching products could not be found." });
    }

    const comparisonData = products.map(p => `
    Title: ${p.title}
    Price: $${p.price}
    Category: ${p.category}
    Rating: ${p.ratings}
    Stock: ${p.stock}
    Variants: ${p.variants.join(", ")}
    Description: ${p.description}
    `).join("\n---\n");

    const systemPrompt = `You are an expert consumer advocate and tech reviewer.
Compare the following products:
${comparisonData}

Create a detailed, beautiful comparison report in Markdown.
Must include:
1. A structured Markdown Table comparing Key Specs, Price, Ratings, and Stock.
2. Direct pros & cons bullet points for each product.
3. Final Verdict: Explicitly advise which user profiles should buy which product (e.g. 'Choose product X if you want portability, but pick Y for higher power').
Ensure the comparison is engaging, highly objective, and readable.`;

    if (isAIAvailable()) {
      try {
        const ai = getGenAI();
        const response = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Generate a product comparison matrix report.",
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.5
            }
          })
        );
        return res.json({ report: response.text, source: "gemini" });
      } catch (err: any) {
        console.warn("[Gemini API Warning] Compare request failed, falling back to local simulator:", err.message);
      }
    }

    // High fidelity markdown generator simulation
    let report = `### ⚖️ AI Compare Matrix (Offline Simulation Mode)\n\n`;
    report += `Here is a side-by-side comparison of your selected items:\n\n`;
    
    // Markdown table
    report += `| Specification | ${products[0].title} | ${products[1].title} |\n`;
    report += `| :--- | :--- | :--- |\n`;
    report += `| **Price** | $${products[0].price} | $${products[1].price} |\n`;
    report += `| **Category** | ${products[0].category} | ${products[1].category} |\n`;
    report += `| **Rating** | ${products[0].ratings} / 5 ⭐ | ${products[1].ratings} / 5 ⭐ |\n`;
    report += `| **Stock Status** | ${products[0].stock > 0 ? "In Stock" : "Out of Stock"} | ${products[1].stock > 0 ? "In Stock" : "Out of Stock"} |\n`;
    report += `| **Variants** | ${products[0].variants.join(", ") || "None"} | ${products[1].variants.join(", ") || "None"} |\n\n`;

    report += `#### 🔍 Product Breakdowns\n\n`;
    products.forEach(p => {
      report += `##### **${p.title}**\n`;
      report += `- **Pros:** Highly-rated feature-rich design. Price is highly competitive for the category.\n`;
      report += `- **Cons:** High consumer demand could lead to inventory stockouts soon.\n\n`;
    });

    report += `#### 🏆 ShopEZ Recommendation Verdict\n`;
    if (products[0].price < products[1].price) {
      report += `- **Value Option:** **${products[0].title}** represents the optimal value choice, saving you $${parseFloat((products[1].price - products[0].price).toFixed(2))} while offering stellar utility.\n`;
      report += `- **Premium Option:** **${products[1].title}** is suited for power users who demand top tier features and do not mind paying a premium.`;
    } else {
      report += `- **Value Option:** **${products[1].title}** is the budget friendly choice, saving you $${parseFloat((products[0].price - products[1].price).toFixed(2))}.\n`;
      report += `- **Premium Option:** **${products[0].title}** offers supreme performance for users seeking the absolute best specs.`;
    }

    report += `\n\n*Note: Simulated review report displayed due to active credentials check warnings.*`;

    res.json({ report, source: "simulation" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate comparison report." });
  }
});

// -------------------------------------------------------------
// 4. AI REVIEW SUMMARIZER
// -------------------------------------------------------------
router.post("/summarize-reviews", async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required." });
    }

    const product = await db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const reviews = await db.getReviews(productId);
    if (reviews.length === 0) {
      return res.json({
        summary: `There are currently no reviews for the **${product.title}**. Write the first review to activate the AI summarizer!`
      });
    }

    const reviewsString = reviews.map(r => `- [Rating: ${r.rating}/5] "${r.comment}"`).join("\n");

    const systemPrompt = `You are "ShopEZ AI Sentiment Analyst".
Analyze the user review log for the product: "${product.title}"
Reviews:
${reviewsString}

Synthesize these reviews into a brief, professional summary report in Markdown.
Include:
1. **Consensus Score:** (Express the overall consumer sentiment, e.g., 'Overwhelmingly Positive' or 'Mixed reviews').
2. **Key Strengths (Pros):** 3-4 bullet points highlighting what buyers loved.
3. **Key Critiques (Cons):** 1-2 points highlighting customer complaints or areas of improvement.
Keep it concise and highly actionable for new prospective buyers.`;

    if (isAIAvailable()) {
      try {
        const ai = getGenAI();
        const response = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Summarize product reviews.",
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.5
            }
          })
        );
        return res.json({ summary: response.text, source: "gemini" });
      } catch (err: any) {
        console.warn("[Gemini API Warning] Summarize reviews failed, falling back to local simulator:", err.message);
      }
    }

    // High fidelity simulator report
    let summary = `### 📝 ShopEZ Sentiment Analysis (Offline Mode)\n\n`;
    const ratings = reviews.map(r => r.rating);
    const avg = ratings.reduce((s,r) => s+r, 0) / ratings.length;

    summary += `**Overall Consensus:** **${avg >= 4.5 ? "Overwhelmingly Positive" : avg >= 4.0 ? "Highly Favorable" : "Generally Favorable"}** (Average: ${avg.toFixed(1)} / 5.0 Stars based on ${reviews.length} reviews)\n\n`;
    
    summary += `##### 🌟 Highlighted Strengths (Pros)\n`;
    summary += `- **Superior Build Quality:** Buyers frequently praise the robust design, material choice, and long-term durability.\n`;
    summary += `- **Great Usability:** Features are easy to configure, fitting perfectly into customers' daily workflow routines.\n`;
    summary += `- **Responsive Aesthetics:** Looks premium and sleek, matches the high-end marketing photos.\n\n`;

    summary += `##### ⚠️ Areas for Improvement (Cons)\n`;
    summary += `- **Premium Cost:** A few users noted that the price point is on the higher side, though they still felt it was worth the cost.\n`;
    summary += `- **Inventory Limits:** Stock levels fluctuate, making quick reorders slightly difficult during high sales periods.\n\n`;
    
    summary += `*Note: Live review analysis is simulated. Custom API key check warning triggered.*`;

    res.json({ summary, source: "simulation" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to summarize reviews." });
  }
});

// -------------------------------------------------------------
// 5. AI IMAGE SEARCH (Using pre-selected sample tags or Vision API)
// -------------------------------------------------------------
router.post("/image-search", async (req, res) => {
  try {
    const { sampleImageId, imageBase64 } = req.body;
    
    let queryTag = "";
    let mockResponseText = "";

    // Dictionary of preselected sample image ids mapping to catalog tags
    const samples: Record<string, { tag: string; label: string }> = {
      "sample_sneaker": { tag: "Footwear", label: "sports athletic sneaker running shoes" },
      "sample_earbuds": { tag: "Electronics", label: "wireless sound earbuds bluetooth headphones" },
      "sample_keyboard": { tag: "Electronics", label: "mechanical gaming wireless keyboard typing" },
      "sample_watch": { tag: "Electronics", label: "smartwatch sport health track fitness heart rate" },
      "sample_bag": { tag: "Accessories", label: "leather bag satchel briefcase office messenger bag" },
      "sample_flask": { tag: "Accessories", label: "insulated water bottle hydro flask smart bottle" }
    };

    if (sampleImageId && samples[sampleImageId]) {
      queryTag = samples[sampleImageId].tag;
      mockResponseText = `I have analyzed the pre-selected sample image representing a **${samples[sampleImageId].label}** item.`;
    } else if (imageBase64) {
      // If user uploaded a custom image, parse it with Gemini Vision
      if (isAIAvailable()) {
        try {
          const ai = getGenAI();
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

          const response = await callGeminiWithTimeout(
            ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                  }
                },
                {
                  text: "Classify this image into one of these e-commerce categories: Electronics, Footwear, Accessories. Output ONLY the single category name, or 'Accessories' if unsure."
                }
              ]
            })
          );

          queryTag = (response.text || "").trim();
          mockResponseText = `AI Image Analysis complete: Identified category as **${queryTag}**.`;
        } catch (err: any) {
          console.warn("[Gemini API Warning] Vision query failed, falling back to simulator:", err.message);
          queryTag = "Electronics";
          mockResponseText = `Uploaded image analysis completed with local defaults: **Electronics**.`;
        }
      } else {
        // Fallback for custom uploads in offline mode
        queryTag = "Electronics"; // default fallback
        mockResponseText = `Uploaded image analyzed in offline mode. Defaulted category to **Electronics**.`;
      }
    } else {
      return res.status(400).json({ error: "Please provide a valid sample image ID or custom base64 image data." });
    }

    // Fetch products that match the identified category
    const products = await db.getProducts();
    const matchedProducts = products.filter(
      p => p.category.toLowerCase() === queryTag.toLowerCase()
    );

    res.json({
      message: mockResponseText,
      category: queryTag,
      products: matchedProducts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "AI Image Search failed." });
  }
});

// -------------------------------------------------------------
// 6. AI BUSINESS INSIGHTS & ADMIN REPORT
// -------------------------------------------------------------
router.get("/insights", requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const products = await db.getProducts();
    const orders = await db.getOrders();
    const userRole = req.user!.role;
    const userId = req.user!.id;

    // Filter data for sellers vs admin
    let targetProducts = products;
    let targetOrders = orders;

    if (userRole === "SELLER") {
      targetProducts = products.filter(p => p.sellerId === userId);
      // Filter orders containing seller products
      targetOrders = orders.filter(o => o.products.some(op => op.productId && targetProducts.some(tp => tp.id === op.productId)));
    }

    const totalRevenue = targetOrders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.totalAmount : 0), 0);
    const lowStockCount = targetProducts.filter(p => p.stock < 10).length;

    const dataReport = `
    Business Role: ${userRole}
    Revenue: $${totalRevenue.toLocaleString()}
    Products Managed: ${targetProducts.length}
    Low Stock Alert Count: ${lowStockCount}
    Total Orders Registered: ${targetOrders.length}
    `;

    const systemPrompt = `You are a Senior Retail Operations Advisor and E-commerce Business Analyst.
Study this performance snapshot for a ${userRole === "ADMIN" ? "Platform Administrator" : "Seller Shop"}:
${dataReport}

Generate an executive retail health report in Markdown.
Must include:
1. **Performance Verdict:** A concise rating on current revenue streams.
2. **Actionable Restocking advice:** Guidance on products running low in stock.
3. **Growth strategy suggestion:** Outline how they can optimize sales (price adjustments, inventory buffers).
4. **Security Auditing (For Admins only):** If role is ADMIN, comment on fraud vulnerability checks (like COD payment ratios vs card payments).
Make the report professional, analytical, and highly insightful.`;

    if (isAIAvailable()) {
      try {
        const ai = getGenAI();
        const response = await callGeminiWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "Conduct a business analytics diagnostic report.",
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.5
            }
          })
        );
        return res.json({ analysis: response.text, source: "gemini" });
      } catch (err: any) {
        console.warn("[Gemini API Warning] Insights failed, falling back to local simulator:", err.message);
      }
    }

    // High fidelity simulation
    let report = `### 📊 AI Retail Operations Diagnostic (Offline Mode)\n\n`;
    report += `#### 1. Performance Verdict\n`;
    report += `Your ${userRole === "ADMIN" ? "Platform-wide" : "Store"} operations are running at a **Healthy** status. Total revenue generated to date is **$${totalRevenue.toLocaleString()}** across **${targetOrders.length} orders**.\n\n`;

    report += `#### 2. Inventory Restocking Alerts\n`;
    if (lowStockCount > 0) {
      report += `- **⚠️ Restock Required:** We detected **${lowStockCount} products** that have fallen below the critical buffer limit (10 units). Replenish these items to prevent stockouts and loss of purchase volume.\n\n`;
    } else {
      report += `- **✅ Inventory Stable:** All products currently show sufficient stock levels (above 10 units).\n\n`;
    }

    report += `#### 3. Seller Growth Strategies\n`;
    report += `- **Price Benchmarking:** Standardize prices in line with historical averages. Dynamic category sorting shows high conversion rates for items priced between $50 and $150.\n`;
    report += `- **Bundle Promotions:** Consider bundling slower-moving items with highly rated electronics like the *Viper Wireless Keyboard* using coupon incentives (e.g. *SHOPEZAI20*) to clear warehouse space.\n\n`;

    if (userRole === "ADMIN") {
      report += `#### 4. Administrative Security Audit & Fraud Checks\n`;
      const codOrders = targetOrders.filter(o => o.paymentMethod === "COD");
      const codRatio = targetOrders.length > 0 ? (codOrders.length / targetOrders.length) * 100 : 0;
      report += `- **Payment Risk Matrix:** COD orders represent **${codRatio.toFixed(1)}%** of overall platform transactions. High COD ratios can increase delivery rejection risks. We suggest incentivizing digital checkout via Stripe/Razorpay (e.g., offer a 10% coupon code) to mitigate return liabilities.\n`;
    }

    report += `\n*Note: Analytical diagnostic insights simulated due to active key check overrides.*`;

    res.json({ analysis: report, source: "simulation" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate business insights." });
  }
});

export default router;
