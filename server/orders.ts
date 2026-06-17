import express from "express";
import { db, Order, OrderProduct, UserAddress } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

const router = express.Router();

// 1. Place a new Order
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { products, paymentMethod, couponCode, shippingAddress } = req.body;
    const user = req.user!;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided in the order payload." });
    }

    if (!paymentMethod || !["STRIPE", "RAZORPAY", "COD"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method specified." });
    }

    const addr = shippingAddress as UserAddress;
    if (!addr || !addr.street || !addr.city || !addr.state || !addr.zip || !addr.country) {
      return res.status(400).json({ error: "Complete shipping address details are required." });
    }

    // Load fresh product details to calculate real price and check stock
    const orderItems: OrderProduct[] = [];
    let subtotal = 0;

    for (const item of products) {
      const dbProd = await db.getProductById(item.productId);
      if (!dbProd) {
        return res.status(404).json({ error: `Product with ID ${item.productId} was not found.` });
      }

      if (dbProd.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product '${dbProd.title}'. Available stock: ${dbProd.stock}. Requested: ${item.quantity}.`
        });
      }

      subtotal += dbProd.price * item.quantity;
      orderItems.push({
        productId: dbProd.id,
        title: dbProd.title,
        price: dbProd.price,
        quantity: item.quantity,
        variant: item.variant || ""
      });
    }

    // Apply coupon if code provided
    let discount = 0;
    if (couponCode) {
      const coupon = await db.getCouponByCode(couponCode);
      if (coupon && coupon.isActive) {
        discount = subtotal * (coupon.discountPercentage / 100);
      }
    }

    const totalAmount = parseFloat((subtotal - discount).toFixed(2));

    // Handle payment simulation
    let paymentStatus: "PENDING" | "PAID" | "FAILED" = "PENDING";
    const { externalPaid } = req.body;

    if (paymentMethod === "COD") {
      paymentStatus = "PENDING";
    } else if (externalPaid) {
      paymentStatus = "PAID";
    } else {
      // Simulate real-time checkout payment debiting
      // If user has enough wallet balance, deduct it. If not, error out (simulates card failure).
      if (user.balance < totalAmount) {
        return res.status(400).json({
          error: `Payment failed. Insufficient funds in account wallet. Required: $${totalAmount.toLocaleString()}. Available: $${user.balance.toLocaleString()}. Please top up in your profile first.`
        });
      }
      paymentStatus = "PAID";
    }

    // Deduct stock and decrease wallet balances
    for (const item of orderItems) {
      const dbProd = await db.getProductById(item.productId);
      if (dbProd) {
        await db.updateProduct(dbProd.id, {
          stock: dbProd.stock - item.quantity
        });
      }
    }

    // Deduct user balance if paid using virtual wallet
    if (paymentStatus === "PAID" && !externalPaid) {
      await db.updateUser(user.id, {
        balance: parseFloat((user.balance - totalAmount).toFixed(2))
      });
    }

    // Create order document
    const newOrder = await db.createOrder({
      userId: user.id,
      userName: user.name,
      products: orderItems,
      totalAmount,
      paymentMethod,
      paymentStatus,
      shippingAddress: addr,
      status: "PLACED"
    });

    // Clear user's cart on database since order is placed
    await db.updateUser(user.id, { cart: [] });

    res.status(201).json({
      message: paymentMethod === "COD" 
        ? "Order registered successfully under Cash On Delivery." 
        : `Payment of $${totalAmount.toLocaleString()} verified. Order placed successfully!`,
      order: newOrder
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Order placement pipeline failed." });
  }
});

// 2. Get purchase history for logged-in user
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const list = await db.getOrders(req.user!.id);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load order history." });
  }
});

// 3. Get specific order details
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order details not found." });
    }

    // Check ownership
    if (order.userId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Order belongs to another account." });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load order information." });
  }
});

// 4. Update/Cancel/Return Order
router.put("/:id/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user!;

    const order = await db.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Verify ownership or admin permissions
    const isOwner = order.userId === user.id;
    const isAdmin = user.role === "ADMIN";
    
    // Find if seller is canceling their product? Simplification: only owner or admin can update status
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access denied." });
    }

    const validUserStatuses = ["CANCELLED", "RETURN_REQUESTED"];
    const validAdminStatuses = ["SHIPPED", "DELIVERED", "RETURNED", "REFUNDED", "CANCELLED"];

    const targetStatus = status.toUpperCase();

    if (isOwner && !isAdmin && !validUserStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Customers can only request cancellations or returns. Valid statuses: ${validUserStatuses.join(", ")}` });
    }

    if (isAdmin && !validAdminStatuses.includes(targetStatus)) {
      return res.status(400).json({ error: `Invalid status transition for administrators.` });
    }

    // Safety checks: Cannot cancel if already shipped/delivered
    if (targetStatus === "CANCELLED" && (order.status === "SHIPPED" || order.status === "DELIVERED" || order.status === "RETURNED")) {
      return res.status(400).json({ error: "Order cannot be cancelled. It has already been shipped or delivered." });
    }

    // Restock inventory if cancelled or returned
    if (targetStatus === "CANCELLED" || targetStatus === "RETURNED") {
      for (const item of order.products) {
        const dbProd = await db.getProductById(item.productId);
        if (dbProd) {
          await db.updateProduct(dbProd.id, {
            stock: dbProd.stock + item.quantity
          });
        }
      }

      // Refund money if payment was already deducted
      if (order.paymentStatus === "PAID") {
        const refundUser = await db.getUserById(order.userId);
        if (refundUser) {
          await db.updateUser(refundUser.id, {
            balance: parseFloat((refundUser.balance + order.totalAmount).toFixed(2))
          });
        }
      }
    }

    const updatedOrder = await db.updateOrder(id, {
      status: targetStatus,
      paymentStatus: targetStatus === "CANCELLED" || targetStatus === "REFUNDED" ? "FAILED" : order.paymentStatus
    });

    res.json({
      message: `Order status successfully modified to '${targetStatus}'.`,
      order: updatedOrder
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update order status." });
  }
});

// 5. Download Invoice Metadata Endpoint
router.get("/:id/invoice", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order details not found." });
    }

    if (order.userId !== req.user!.id && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Invoice owner mismatch." });
    }

    const taxAmount = parseFloat((order.totalAmount * 0.18).toFixed(2)); // mock 18% GST/VAT
    const subtotal = parseFloat((order.totalAmount - taxAmount).toFixed(2));

    res.json({
      invoiceNumber: `INV-${order.id.slice(-6).toUpperCase()}-${new Date(order.createdAt).getFullYear()}`,
      invoiceDate: new Date(order.createdAt).toLocaleDateString(),
      dueDate: new Date(new Date(order.createdAt).getTime() + 7 * 24 * 3600000).toLocaleDateString(),
      orderId: order.id,
      customer: {
        name: order.userName,
        email: req.user!.email,
        phone: req.user!.phone,
        address: order.shippingAddress
      },
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
        total: order.totalAmount,
        subtotal,
        tax: taxAmount
      },
      items: order.products
    });
  } catch (error: any) {
    res.status(500).json({ error: "Invoice retrieval failed." });
  }
});

// 6. Create Razorpay Order API
router.post("/razorpay-order", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount } = req.body;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === "YOUR_RAZORPAY_KEY_ID") {
      // Return details for simulated mode
      return res.json({ 
        simulated: true, 
        orderId: `order_sim_${Math.random().toString(36).substr(2, 9)}`,
        amount: Math.round(amount * 100) // in paise
      });
    }

    // Call Razorpay API to create an order
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      })
    });

    const data = await response.json();
    if (response.ok) {
      return res.json({
        simulated: false,
        orderId: data.id,
        amount: data.amount,
        keyId
      });
    } else {
      return res.status(400).json({ error: data.error?.description || "Failed to create Razorpay order" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Razorpay API error" });
  }
});

// 7. Verify Razorpay Payment Signature API
router.post("/razorpay-verify", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret || keySecret === "YOUR_RAZORPAY_KEY_SECRET") {
      // Simulated signature verification passes
      return res.json({ status: "success", message: "Simulated payment verified successfully!" });
    }

    // Perform signature check
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest("hex");

    if (generated_signature === razorpay_signature) {
      res.json({ status: "success", message: "Razorpay signature verified!" });
    } else {
      res.status(400).json({ error: "Invalid payment signature verification failed." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Signature check failed" });
  }
});

export default router;
