# ShopEZ AI — AI-Powered Enterprise MERN E-Commerce Platform

ShopEZ AI is a production-ready, enterprise-grade full-stack MERN (MongoDB, Express, React, Node) e-commerce platform designed to deliver next-generation shopping experiences by combining standard checkout workflows with advanced generative AI features powered by Google Gemini.

The platform is designed to look like a modern combination of Amazon, Flipkart, Shopify, and Vercel, featuring sleek glassmorphic aesthetics, a native dark/light theme engine, responsive layouts, and robust user dashboards.

---

## Key Features

### 🛍️ Customer Storefront
- **High-Converting Landing Banners**: Banners for trending products, flash sales with count-downs, and categories.
- **Smart Catalog Filters**: Search queries matching titles/descriptions, category quick-tabs, price ranges, rating stars, and sorting (Price: High-to-Low/Low-to-High, Top Rated, New Arrivals).
- **Product Variant & Qty Selector**: Comma-split color/spec selectors and increment bounds.
- **Wishlist & Cart**: Sliding side badges, items summary, and coupon discount calculations.
- **Simulated Payment Gateways**: Mock checkout supporting Stripe, Razorpay, or COD.
- **Orders & Tracking**: Order timeline logs, tracking codes, cancellations/returns, and printable invoice downloads.

### 🤖 Next-Gen AI Engines (Google Gemini 3.5 Flash)
1. **AI Shopping Assistant (Chatbot)**: Floating coach on every page. Answers catalog specifications, recommends category additions, and guides checkouts.
2. **AI Recommendation Widget**: Displays personalized suggestions on the home screen based on user wishlist history, cart additions, and prior purchase categories.
3. **AI Side-by-Side Comparison**: Generates comparison grids comparing key specifications, pricing, ratings, stock, and draft final buyer recommendations.
4. **AI Review Summarizer**: Synthesizes thousands of text reviews into Consensuses, Strengths (Pros), and Critiques (Cons).
5. **AI Voice Shopping**: Supports HTML5 Speech Recognition to capture queries (or simulate mock statements if mic is unsupported).
6. **AI Image Search**: Visual search mapping pre-defined sample pictures (sneakers, earbuds, watch, satchel) or custom Base64 uploads to catalog categories using Gemini vision.

### 💼 Seller Hub Dashboard
- **Store KPIs**: Total revenue tracker, listed catalog size, and low-inventory warnings.
- **Inventory CRUD**: Form to add/edit product specifications, variants, and stock balances.
- **Order Fulfillment**: Review merchant orders and mark items as Shipped or Delivered.
- **Visual Sales Graph**: Animated vertical weekly sales bar charts.
- **AI Sales Insights**: Forecasts stock restocks and dynamic bundle strategies.

### 🛡️ Administrative Panel
- **Global KPIs**: Platform-wide checkout counts, active merchants, and product sizes.
- **User Moderation Table**: Promote/demote user roles (Customer, Seller, Admin) and adjust virtual balances.
- **Fraud Auditing Alert Ledger**: Flag anomalous cash injections or returns velocity.
- **bulletin Board**: Compose and delete global system notifications.
- **AI Executive Operations Report**: Generates platform payment risk analyses.

---

## Technical Architecture

### 1. Dual-Mode Database Connection
To guarantee the application is **production-ready** yet **runnable out-of-the-box**, the database layer (`server/db.ts`) operates in two modes:
- **MongoDB Atlas Mode**: Automatically connects via Mongoose if a `MONGODB_URI` environment variable is defined.
- **Simulated Local Mode (Fallback)**: Defaults if `MONGODB_URI` is missing. It reads and writes JSON documents to the `data/` folder, replicating all relational queries, stock modifications, and review averages.

### 2. Environment Variables (.env)
Create a `.env` file in the root of the project with the following:
```env
# MongoDB Connection (Atlas or Local Host)
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/shopez_ai"

# Gemini API Key (Configure in Google AI Studio)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# JWT Secret for Session Encryption
JWT_SECRET="shopez_ai_secret_key_999!"

# Port Configurations
PORT=3000
NODE_ENV="development"
```

---

## Project Folder Structure

```
shopez-tradex/
├── data/                    # JSON file persistence (Local simulation fallback)
│   ├── users.json
│   ├── products.json
│   └── ...
├── server/                  # Express API Subrouters
│   ├── db.ts                # Dual-mode schemas & CRUD methods
│   ├── auth.ts              # Role-Based Access Control
│   ├── products.ts          # Catalog, Wishlist, Cart & Coupons APIs
│   ├── orders.ts            # Order match & invoice generator APIs
│   ├── ai.ts                # Gemini API integrations
│   └── admin.ts             # Moderation & Fraud audit APIs
├── src/                     # React Client Code
│   ├── components/
│   │   ├── views/           # Modular Client Screens
│   │   │   ├── Home.tsx
│   │   │   ├── Shop.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Wishlist.tsx
│   │   │   ├── OrdersList.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── SellerDashboard.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── Login.tsx
│   │   ├── AppContext.tsx   # Global Cart & Auth Context API
│   │   └── AppLayout.tsx    # Aesthetic Header Navigation Shell
│   ├── types.ts             # TypeScript Shared Models
│   ├── App.tsx              # React Client router
│   ├── index.css            # Tailwind & animation configurations
│   └── main.tsx
├── package.json
├── server.ts                # Express backend entry point
├── tsconfig.json
└── vite.config.ts
```

---

## Installation & Setup Instructions

### 1. Install Dependencies
Run the command below inside the project directory:
```bash
npm install
```

### 2. Configure Credentials
Open the `.env` file and input your **Gemini API Key** and **MongoDB URI** credentials. If left unset, the platform runs in Local Simulation mode with sample mock product data seeded.

### 3. Run Development Server
Start both the Express backend and the Vite HMR frontend server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Build for Production
To bundle the frontend assets and compile the TypeScript backend server:
```bash
npm run build
```
Start the production server:
```bash
npm start
```

---

## Testing User Credentials (Mock Seeding)
The platform seeds three default accounts automatically for quick validation:
1. **Customer**: `customer@shopez.com` (password: `customer123`)
2. **Seller**: `seller@shopez.com` (password: `seller123`)
3. **Admin**: `admin@shopez.com` (password: `admin123`)
