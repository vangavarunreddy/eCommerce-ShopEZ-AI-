import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, User } from "./db";

export const JWT_SECRET = process.env.JWT_SECRET || "shopez_ai_secret_key_999!";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Generate JWT for User Session
export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Middleware: Authenticate Requesting User
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No authorization token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    
    // Fetch from database (sync or async)
    db.getUserById(decoded.id).then((user) => {
      if (!user) {
        return res.status(401).json({ error: "User associated with this token no longer exists." });
      }
      req.user = user;
      next();
    }).catch(() => {
      return res.status(500).json({ error: "Database authentication failure." });
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired authorization token." });
  }
}

// Middleware: Verify Admin Privileges
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === "ADMIN") {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Admin privileges required." });
    }
  });
}

// Middleware: Verify Seller Privileges
export function requireSeller(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user && (req.user.role === "SELLER" || req.user.role === "ADMIN")) {
      next();
    } else {
      res.status(403).json({ error: "Access denied. Seller privileges required." });
    }
  });
}

import express from "express";
const router = express.Router();

// 1. User Registration Endpoint
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, street, city, state, zip, country } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await db.getUserByEmail(emailLower);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const targetRole = role && ["CUSTOMER", "SELLER", "ADMIN"].includes(role.toUpperCase()) 
      ? role.toUpperCase() 
      : "CUSTOMER";

    const initialBalance = targetRole === "ADMIN" ? 1000000.0 : targetRole === "SELLER" ? 25000.0 : 5000.0;

    const newUser = await db.createUser({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role: targetRole,
      phone: phone || "",
      address: {
        street: street || "",
        city: city || "",
        state: state || "",
        zip: zip || "",
        country: country || ""
      },
      balance: initialBalance,
      wishlist: [],
      cart: [],
      createdAt: new Date().toISOString()
    });

    const token = generateToken(newUser);
    const { passwordHash: _, ...userResponse } = newUser;

    res.status(201).json({
      message: `Account created successfully. Welcome to ShopEZ AI as a ${targetRole}!`,
      token,
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal registration error" });
  }
});

// 2. User Login Endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Please enter your email and password." });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await db.getUserByEmail(emailLower);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const correctPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!correctPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...userResponse } = user;

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal login error" });
  }
});

// 3. Forgot Password Endpoint (Simulator)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Please provide your email address." });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "No account registered with this email." });
    }

    // Return a mock reset token link for demo purposes
    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });
    const resetLink = `/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    res.json({
      message: "Password reset instructions sent. Please check your simulated inbox below.",
      resetLink,
      instructions: "Click the mock link above to reset your password. The link is active for 1 hour."
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Forgot password process failed." });
  }
});

// 4. Verify Email Endpoint (Simulator)
router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email parameter required." });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      message: `Verification code successfully dispatched to ${user.email}.`,
      verificationLink: `/verify-account?code=V-${Math.floor(100000 + Math.random() * 900000)}`,
      success: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Email verification failed." });
  }
});

// 5. Get Logged In User details
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(404).json({ error: "User context not found." });
  }
  const { passwordHash: _, ...userResponse } = req.user;
  res.json({ user: userResponse });
});

// 6. User Wallet Deposit (Booster simulation for checkouts)
router.post("/wallet/deposit", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { amount } = req.body;
    const depositAmt = parseFloat(amount);

    if (isNaN(depositAmt) || depositAmt <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount." });
    }

    const user = req.user!;
    const updatedUser = await db.updateUser(user.id, {
      balance: parseFloat((user.balance + depositAmt).toFixed(2))
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const { passwordHash: _, ...userResponse } = updatedUser;
    res.json({
      message: `$${depositAmt.toLocaleString()} loaded into your mock wallet!`,
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Wallet deposit failed." });
  }
});

// 7. Update User Address details
router.put("/profile/address", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { street, city, state, zip, country, phone } = req.body;
    const user = req.user!;

    const updatedUser = await db.updateUser(user.id, {
      phone: phone || user.phone,
      address: {
        street: street ?? user.address.street,
        city: city ?? user.address.city,
        state: state ?? user.address.state,
        zip: zip ?? user.address.zip,
        country: country ?? user.address.country
      }
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const { passwordHash: _, ...userResponse } = updatedUser;
    res.json({
      message: "Delivery details updated successfully.",
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Profile update failed." });
  }
});

export default router;
