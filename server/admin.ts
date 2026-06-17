import express from "express";
import { db, User } from "./db";
import { requireAdmin, AuthenticatedRequest } from "./auth";

const router = express.Router();

// Enforce admin check on all endpoints
router.use(requireAdmin);

// 1. Get all system user accounts
router.get("/users", async (req, res) => {
  try {
    const list = await db.getUsers();
    const listSansHash = list.map((u) => {
      const { passwordHash: _, ...rest } = u;
      return rest;
    });
    res.json(listSansHash);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load platform user listing." });
  }
});

// 2. Adjust User mock balance
router.post("/users/:id/balance", async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;

    const amt = parseFloat(balance);
    if (isNaN(amt) || amt < 0) {
      return res.status(400).json({ error: "Balance amount must be a positive number." });
    }

    const updated = await db.updateUser(id, { balance: parseFloat(amt.toFixed(2)) });
    if (!updated) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const { passwordHash: _, ...userSansHash } = updated;
    res.json({
      message: `Adjusted balance for ${updated.name} to $${updated.balance.toLocaleString()}`,
      user: userSansHash
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to adjust balance." });
  }
});

// 3. Promote/Demote User Role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !["CUSTOMER", "SELLER", "ADMIN"].includes(role.toUpperCase())) {
      return res.status(400).json({ error: "Invalid role. Allowed: CUSTOMER, SELLER, ADMIN" });
    }

    const updated = await db.updateUser(id, { role: role.toUpperCase() });
    if (!updated) {
      return res.status(404).json({ error: "User not found." });
    }

    const { passwordHash: _, ...userSansHash } = updated;
    res.json({
      message: `Updated role of ${updated.name} to '${updated.role}'`,
      user: userSansHash
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update role." });
  }
});

// 4. Retrieve Master Order Ledger logs
router.get("/transactions", async (req, res) => {
  try {
    const list = await db.getOrders();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve master order logs." });
  }
});

// 5. Audit logs for suspicious transactions (fraud audit)
router.get("/suspicious", async (req, res) => {
  try {
    const audits: { userId: string; name: string; email: string; reason: string; severity: "critical" | "warning" }[] = [];
    const users = await db.getUsers();
    const orders = await db.getOrders();

    // Audit users with extremely high balances
    users.forEach((u) => {
      if (u.balance > 250000) {
        audits.push({
          userId: u.id,
          name: u.name,
          email: u.email,
          reason: `Outsized mock wallet balance ($${u.balance.toLocaleString()}) representing anomalous deposit activity.`,
          severity: "warning"
        });
      }
    });

    // Audit orders: check for suspicious cancellation velocity or bulk amount purchases
    orders.forEach((o) => {
      if (o.totalAmount > 1000) {
        audits.push({
          userId: o.userId,
          name: o.userName,
          email: "N/A (Order Log)",
          reason: `High-value checkout transaction flag: Order for $${o.totalAmount.toLocaleString()} placed via ${o.paymentMethod}.`,
          severity: "warning"
        });
      }

      if (o.status === "CANCELLED" && o.totalAmount > 500) {
        audits.push({
          userId: o.userId,
          name: o.userName,
          email: "N/A (Order Log)",
          reason: `Anomalous Return/Cancel behavior: Cancelled transaction value of $${o.totalAmount.toLocaleString()} refunded to balance.`,
          severity: "critical"
        });
      }
    });

    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to run fraud audit." });
  }
});

// 6. Global Analytics KPIs
router.get("/dashboard-analytics", async (req, res) => {
  try {
    const users = await db.getUsers();
    const products = await db.getProducts();
    const orders = await db.getOrders();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.totalAmount : 0), 0);
    const pendingFulfillments = orders.filter(o => o.status === "PLACED" || o.status === "SHIPPED").length;
    const sellersCount = users.filter(u => u.role === "SELLER").length;
    const customersCount = users.filter(u => u.role === "CUSTOMER").length;

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    products.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    // Payment method distribution
    const paymentCounts: Record<string, number> = { STRIPE: 0, RAZORPAY: 0, COD: 0 };
    orders.forEach(o => {
      paymentCounts[o.paymentMethod] = (paymentCounts[o.paymentMethod] || 0) + 1;
    });

    res.json({
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        pendingFulfillments,
        totalProducts: products.length,
        sellersCount,
        customersCount
      },
      categoryDistribution: Object.entries(categoryCounts).map(([name, value]) => ({ name, value })),
      paymentDistribution: Object.entries(paymentCounts).map(([name, value]) => ({ name, value }))
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to calculate dashboard analytics KPIs." });
  }
});

// 7. Post global system announcements
router.post("/announcements", (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: "Title, content description, and category classification are required." });
    }

    const ann = {
      id: "ann_" + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      content: content.trim(),
      date: new Date().toISOString(),
      category: category // "news" | "maintenance" | "system"
    };

    db.localAnnouncements.unshift(ann);
    db.saveAnnouncements();

    res.status(201).json({ message: "System announcement published successfully!", announcement: ann });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to publish announcement." });
  }
});

export default router;
