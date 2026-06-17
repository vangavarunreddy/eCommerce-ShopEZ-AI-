import express from "express";
import { db, Stock, Transaction, Holding, Portfolio } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

const router = express.Router();

// 1. Browse and Search Stocks (Support Search, Filters, Stats)
router.get("/", (req, res) => {
  try {
    const { q, minPrice, maxPrice, sortBy, limit } = req.query;
    let list = [...db.stocks];

    // Simple search (by symbol or company name)
    if (q) {
      const queryStr = String(q).toLowerCase();
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(queryStr) ||
          s.name.toLowerCase().includes(queryStr)
      );
    }

    // Filter by price range
    if (minPrice) {
      list = list.filter((s) => s.price >= parseFloat(String(minPrice)));
    }
    if (maxPrice) {
      list = list.filter((s) => s.price <= parseFloat(String(maxPrice)));
    }

    // Sort by options: price_asc, price_desc, name_asc, symbol, volume_desc, volatility
    if (sortBy) {
      const sort = String(sortBy);
      if (sort === "price_asc") {
        list.sort((a, b) => a.price - b.price);
      } else if (sort === "price_desc") {
        list.sort((a, b) => b.price - a.price);
      } else if (sort === "name_asc") {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sort === "volume_desc") {
        list.sort((a, b) => b.volume - a.volume);
      } else if (sort === "marketcap_desc") {
        list.sort((a, b) => b.marketCap - a.marketCap);
      }
    }

    // Pagination/Limit
    if (limit) {
      const lim = parseInt(String(limit));
      if (!isNaN(lim) && lim > 0) {
        list = list.slice(0, lim);
      }
    }

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stocks list" });
  }
});

// 2. Fetch Single Stock detail (with 30-day historical chart points)
router.get("/:symbol", (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = db.stocks.find((s) => s.symbol === symbol);

    if (!stock) {
      return res.status(404).json({ error: `Stock symbol ${symbol} not found.` });
    }

    res.json(stock);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch stock" });
  }
});

// 3. User Portfolio Endpoint
router.get("/user/portfolio", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    let portfolio = db.portfolios.find((p) => p.userId === userId);

    if (!portfolio) {
      // Create if missing
      portfolio = { userId, holdings: [] };
      db.portfolios.push(portfolio);
      db.savePortfolios();
    }

    // Construct enriched response with live prices and profit summaries
    let totalInvested = 0;
    let totalCurrentValue = 0;

    const enrichedHoldings = portfolio.holdings.map((h) => {
      const currentStock = db.stocks.find((s) => s.symbol === h.symbol);
      const curPrice = currentStock ? currentStock.price : h.averagePurchasePrice;
      const totalCostRaw = h.quantity * h.averagePurchasePrice;
      const currentValueRaw = h.quantity * curPrice;
      const profitLossRaw = currentValueRaw - totalCostRaw;
      const profitLossPctRaw = totalCostRaw > 0 ? (profitLossRaw / totalCostRaw) * 100 : 0;

      totalInvested += totalCostRaw;
      totalCurrentValue += currentValueRaw;

      return {
        ...h,
        currentPrice: curPrice,
        companyName: currentStock ? currentStock.name : h.symbol,
        totalCost: parseFloat(totalCostRaw.toFixed(2)),
        totalValue: parseFloat(currentValueRaw.toFixed(2)),
        profitLoss: parseFloat(profitLossRaw.toFixed(2)),
        profitLossPct: parseFloat(profitLossPctRaw.toFixed(2))
      };
    });

    const netProfitLoss = totalCurrentValue - totalInvested;
    const netProfitLossPct = totalInvested > 0 ? (netProfitLoss / totalInvested) * 100 : 0;

    res.json({
      userId,
      holdings: enrichedHoldings,
      totalInvestment: parseFloat(totalInvested.toFixed(2)),
      currentPortfolioValue: parseFloat(totalCurrentValue.toFixed(2)),
      netProfitLoss: parseFloat(netProfitLoss.toFixed(2)),
      netProfitLossPct: parseFloat(netProfitLossPct.toFixed(2)),
      userWalletBalance: req.user!.balance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load user portfolio" });
  }
});

// 4. Execution of Order: BUY or SELL Stock in virtual market
router.post("/trade", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { symbol: symRaw, type, quantity: qtyRaw } = req.body;

    if (!symRaw || !type || !qtyRaw) {
      return res.status(400).json({ error: "Missing required stock symbol, type, or quantity parameters." });
    }

    const symbol = symRaw.toUpperCase().trim();
    const quantity = parseInt(qtyRaw);

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Trade quantity must be a positive integer." });
    }

    if (type !== "BUY" && type !== "SELL") {
      return res.status(400).json({ error: "Invalid trade type. Must be BUY or SELL." });
    }

    // Retrieve stock
    const stock = db.stocks.find((s) => s.symbol === symbol);
    if (!stock) {
      return res.status(404).json({ error: `Stock ticker '${symbol}' does not exist on this exchange.` });
    }

    const price = stock.price;
    const totalAmount = parseFloat((price * quantity).toFixed(2));

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    let portfolio = db.portfolios.find((p) => p.userId === userId);
    if (!portfolio) {
      portfolio = { userId, holdings: [] };
      db.portfolios.push(portfolio);
    }

    let holdingIndex = portfolio.holdings.findIndex((h) => h.symbol === symbol);

    if (type === "BUY") {
      // Validate cash balance
      if (user.balance < totalAmount) {
        return res.status(400).json({
          error: `Insufficient funds. Total transaction cost is $${totalAmount.toLocaleString()}, but your balance is only $${user.balance.toLocaleString()}.`
        });
      }

      // Charge user balance
      user.balance = parseFloat((user.balance - totalAmount).toFixed(2));

      if (holdingIndex >= 0) {
        // Update holding using Weighted Average Purchase Price formula
        const currentHolding = portfolio.holdings[holdingIndex];
        const oldQty = currentHolding.quantity;
        const oldAvg = currentHolding.averagePurchasePrice;

        const newQty = oldQty + quantity;
        const newAvg = parseFloat(((oldAvg * oldQty + price * quantity) / newQty).toFixed(4));

        currentHolding.quantity = newQty;
        currentHolding.averagePurchasePrice = newAvg;
      } else {
        // Add completely new holding
        portfolio.holdings.push({
          symbol,
          quantity,
          averagePurchasePrice: price
        });
      }
    } else {
      // SELL trade logic
      if (holdingIndex < 0 || portfolio.holdings[holdingIndex].quantity < quantity) {
        const ownedQty = holdingIndex >= 0 ? portfolio.holdings[holdingIndex].quantity : 0;
        return res.status(400).json({
          error: `Insufficient shares. You attempted to sell ${quantity} shares of ${symbol}, but you inside your portfolio only own ${ownedQty} shares.`
        });
      }

      // Debit shares
      const holding = portfolio.holdings[holdingIndex];
      holding.quantity -= quantity;

      // Clean holding if completely liquidated
      if (holding.quantity === 0) {
        portfolio.holdings.splice(holdingIndex, 1);
      }

      // Add sales proceed to wallet balance
      user.balance = parseFloat((user.balance + totalAmount).toFixed(2));
    }

    // Commit Transaction log
    const transaction: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      userId,
      symbol,
      type,
      quantity,
      price,
      timestamp: new Date().toISOString()
    };

    db.transactions.push(transaction);

    // Save databases
    db.saveUsers();
    db.savePortfolios();
    db.saveTransactions();

    res.status(201).json({
      message: `Successfully executed: ${type} ${quantity} shares of ${symbol} (${stock.name}) at $${price} per share.`,
      transaction,
      walletBalance: user.balance,
      holdings: portfolio.holdings
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process stock order." });
  }
});

// 5. Fetch specific user transactions
router.get("/user/transactions", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const list = db.transactions
      .filter((tx) => tx.userId === req.user!.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load transactions." });
  }
});

// 6. Fetch user Watchlist Full Detail
router.get("/user/watchlist", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userSymbols = req.user!.watchlist;
    const enrichedList = db.stocks.filter((s) => userSymbols.includes(s.symbol));
    res.json(enrichedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load watchlist" });
  }
});

// 7. Toggle stocks in user Watchlist
router.post("/user/watchlist/toggle", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { symbol: symRaw } = req.body;
    if (!symRaw) {
      return res.status(400).json({ error: "Missing stock symbol ticker to toggle in watchlist." });
    }

    const symbol = symRaw.toUpperCase().trim();
    const user = db.users.find((u) => u.id === req.user!.id);

    if (!user) {
      return res.status(404).json({ error: "User context missing." });
    }

    const index = user.watchlist.indexOf(symbol);
    let actionState = "added";

    if (index >= 0) {
      user.watchlist.splice(index, 1);
      actionState = "removed";
    } else {
      user.watchlist.push(symbol);
    }

    db.saveUsers();

    res.json({
      message: `Stock ${symbol} successfully ${actionState} your personal watchlist!`,
      watchlist: user.watchlist,
      symbol,
      isIncluded: actionState === "added"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to modify watchlist" });
  }
});

export default router;
