import express from "express";
import { db, Product } from "./db";
import { requireAuth, requireSeller, AuthenticatedRequest } from "./auth";

const router = express.Router();

// 1. Get products (with pagination, search, category, price, rating filters & sorting)
router.get("/", async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, rating, sort } = req.query;

    let products = await db.getProducts();

    // Text search
    if (search) {
      const q = (search as string).toLowerCase().trim();
      products = products.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category && category !== "All") {
      const cat = (category as string).toLowerCase().trim();
      products = products.filter((p) => p.category.toLowerCase() === cat);
    }

    // Price range filter
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min)) {
        products = products.filter((p) => p.price >= min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max)) {
        products = products.filter((p) => p.price <= max);
      }
    }

    // Rating filter (minimum average rating)
    if (rating) {
      const rate = parseFloat(rating as string);
      if (!isNaN(rate)) {
        products = products.filter((p) => p.ratings >= rate);
      }
    }

    // Sorting
    if (sort) {
      const s = sort as string;
      if (s === "price-asc") {
        products.sort((a, b) => a.price - b.price);
      } else if (s === "price-desc") {
        products.sort((a, b) => b.price - a.price);
      } else if (s === "newest") {
        products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (s === "rating") {
        products.sort((a, b) => b.ratings - a.ratings);
      }
    }

    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load products." });
  }
});

// 2. Get unique categories list
router.get("/categories", async (req, res) => {
  try {
    const products = await db.getProducts();
    const categories = Array.from(new Set(products.map((p) => p.category)));
    res.json(["All", ...categories]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load product categories." });
  }
});

// 3. Get seller-specific product catalog
router.get("/seller-catalog", requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const sellerId = req.user!.id;
    const products = await db.getProducts();
    const sellerCatalog = products.filter((p) => p.sellerId === sellerId);
    res.json(sellerCatalog);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load seller catalog." });
  }
});

// 4. Get wishlist items for authorized user
router.get("/wishlist", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const allProducts = await db.getProducts();
    const wishlistItems = allProducts.filter((p) => user.wishlist.includes(p.id));
    res.json(wishlistItems);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load wishlist items." });
  }
});

// 5. Toggle item in wishlist
router.post("/wishlist/toggle", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: "Product ID required." });
    }

    const user = req.user!;
    const index = user.wishlist.indexOf(productId);
    let wishlist = [...user.wishlist];

    let message = "";
    if (index >= 0) {
      wishlist.splice(index, 1);
      message = "Product removed from your Wishlist.";
    } else {
      wishlist.push(productId);
      message = "Product added to your Wishlist.";
    }

    await db.updateUser(user.id, { wishlist });
    res.json({ message, wishlist });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to toggle wishlist." });
  }
});

// 6. Get cart items with full product details
router.get("/cart", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const allProducts = await db.getProducts();

    const cartWithDetails = user.cart.map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        variant: item.variant,
        product
      };
    }).filter(item => item.product !== undefined);

    res.json(cartWithDetails);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to retrieve shopping cart." });
  }
});

// 7. Sync/Update cart array
router.post("/cart", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { cart } = req.body; // Expects array of UserCartItem
    if (!Array.isArray(cart)) {
      return res.status(400).json({ error: "Cart payload must be an array." });
    }

    const user = req.user!;
    const updated = await db.updateUser(user.id, { cart });
    res.json({ message: "Cart synced successfully.", cart: updated?.cart || [] });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to sync cart." });
  }
});

// 8. Apply Coupon code
router.post("/coupons/apply", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Coupon code is required." });
    }

    const coupon = await db.getCouponByCode(code);
    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ error: "Invalid or expired coupon code." });
    }

    res.json({
      message: `Coupon code '${coupon.code}' applied! You saved ${coupon.discountPercentage}%.`,
      coupon
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to apply coupon." });
  }
});

// 9. Get detailed product view with reviews and related products
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const reviews = await db.getReviews(product.id);
    const allProducts = await db.getProducts();

    // Find related products in same category (excluding this product, limit to 4)
    const related = allProducts
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);

    res.json({
      product,
      reviews,
      related
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load product details." });
  }
});

// 10. Seller: Add a new Product
router.post("/", requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, price, category, images, variants, stock } = req.body;

    if (!title || !description || price === undefined || !category || stock === undefined) {
      return res.status(400).json({ error: "Please provide all required product details." });
    }

    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock);
    if (isNaN(priceNum) || priceNum <= 0 || isNaN(stockNum) || stockNum < 0) {
      return res.status(400).json({ error: "Price and Stock must be valid positive values." });
    }

    const newProduct = await db.createProduct({
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category: category.trim(),
      images: Array.isArray(images) && images.length > 0 ? images : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop"],
      variants: Array.isArray(variants) ? variants : [],
      stock: stockNum,
      sellerId: req.user!.id,
      sellerName: req.user!.name,
      ratings: 5.0
    });

    res.status(201).json({
      message: `Product '${newProduct.title}' listed successfully in ${newProduct.category}!`,
      product: newProduct
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create product." });
  }
});

// 11. Seller: Update Product Details
router.put("/:id", requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, images, variants, stock } = req.body;
    const sellerId = req.user!.id;

    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Protect other sellers' products unless admin
    if (product.sellerId !== sellerId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. You can only modify your own products." });
    }

    const updates: Partial<Product> = {};
    if (title) updates.title = title.trim();
    if (description) updates.description = description.trim();
    if (category) updates.category = category.trim();
    if (images) updates.images = images;
    if (variants) updates.variants = variants;
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (!isNaN(priceNum) && priceNum > 0) updates.price = priceNum;
    }
    if (stock !== undefined) {
      const stockNum = parseInt(stock);
      if (!isNaN(stockNum) && stockNum >= 0) updates.stock = stockNum;
    }

    const updated = await db.updateProduct(id, updates);
    res.json({ message: "Product details updated successfully.", product: updated });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update product details." });
  }
});

// 12. Seller: Delist Product
router.delete("/:id", requireSeller, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user!.id;

    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (product.sellerId !== sellerId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. You can only delist your own products." });
    }

    await db.deleteProduct(id);
    res.json({ message: `Product '${product.title}' has been successfully delisted.` });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delist product." });
  }
});

// 13. Customer: Add Product Review
router.post("/:id/review", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const productId = req.params.id;
    const { rating, comment } = req.body;
    const user = req.user!;

    if (!rating || !comment) {
      return res.status(400).json({ error: "Rating (1-5) and comment review content are required." });
    }

    const rateNum = parseInt(rating);
    if (isNaN(rateNum) || rateNum < 1 || rateNum > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    }

    const product = await db.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const newReview = await db.createReview({
      userId: user.id,
      userName: user.name,
      productId: product.id,
      rating: rateNum,
      comment: comment.trim()
    });

    res.status(201).json({
      message: "Review posted successfully! Thank you for your feedback.",
      review: newReview
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to post product review." });
  }
});

export default router;
