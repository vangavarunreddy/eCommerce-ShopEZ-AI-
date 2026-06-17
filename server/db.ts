import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Interfaces
export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface UserCartItem {
  productId: string;
  quantity: number;
  variant: string;
}

export interface User {
  id: string; // Will map to _id in MongoDB
  name: string;
  email: string;
  passwordHash: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  address: UserAddress;
  phone: string;
  balance: number; // mock wallet balance for easy purchase validation
  wishlist: string[]; // array of product IDs
  cart: UserCartItem[];
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  variants: string[];
  stock: number;
  sellerId: string;
  sellerName: string;
  ratings: number; // average rating
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface OrderProduct {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  variant: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  products: OrderProduct[];
  totalAmount: number;
  paymentMethod: "STRIPE" | "RAZORPAY" | "COD";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  shippingAddress: UserAddress;
  status: "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED" | "RETURNED" | "REFUNDED";
  trackingNumber: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountPercentage: number;
  isActive: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: "news" | "maintenance" | "system";
}

// -------------------------------------------------------------
// MongoDB (Mongoose) Setup
// -------------------------------------------------------------
let isMongoConnected = false;

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["CUSTOMER", "SELLER", "ADMIN"], default: "CUSTOMER" },
  address: {
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    country: { type: String, default: "" }
  },
  phone: { type: String, default: "" },
  balance: { type: Number, default: 5000.0 }, // default mock balance
  wishlist: [{ type: String }],
  cart: [{
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    variant: { type: String, default: "" }
  }]
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  images: [{ type: String }],
  variants: [{ type: String }],
  stock: { type: Number, required: true, default: 0 },
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  ratings: { type: Number, default: 5 }
}, { timestamps: true });

const ReviewSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  productId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  products: [{
    productId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    variant: { type: String, default: "" }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["STRIPE", "RAZORPAY", "COD"], required: true },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true }
  },
  status: { type: String, enum: ["PLACED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"], default: "PLACED" },
  trackingNumber: { type: String, default: "" }
}, { timestamps: true });

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
});

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true },
  category: { type: String, required: true }
});

// Mongoose Models
let MongoUser: mongoose.Model<any>;
let MongoProduct: mongoose.Model<any>;
let MongoReview: mongoose.Model<any>;
let MongoOrder: mongoose.Model<any>;
let MongoCoupon: mongoose.Model<any>;
let MongoAnnouncement: mongoose.Model<any>;

async function connectMongoDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("[ShopEZ AI DB] No MONGODB_URI configured. Running in Local Simulated Mode.");
    return;
  }
  try {
    await mongoose.connect(uri);
    isMongoConnected = true;
    console.log("[ShopEZ AI DB] Successfully connected to MongoDB Atlas.");

    // Bind models
    MongoUser = mongoose.models.User || mongoose.model("User", UserSchema);
    MongoProduct = mongoose.models.Product || mongoose.model("Product", ProductSchema);
    MongoReview = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
    MongoOrder = mongoose.models.Order || mongoose.model("Order", OrderSchema);
    MongoCoupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
    MongoAnnouncement = mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
  } catch (error) {
    console.error("[ShopEZ AI DB] MongoDB Connection Error:", error);
    console.log("[ShopEZ AI DB] Falling back to Local Simulated Mode.");
    isMongoConnected = false;
  }
}

// -------------------------------------------------------------
// Database Coordinator (Dual-Mode Interface)
// -------------------------------------------------------------
class ShopEZDatabase {
  private usersFile = "users.json";
  private productsFile = "products.json";
  private reviewsFile = "reviews.json";
  private ordersFile = "orders.json";
  private couponsFile = "coupons.json";
  private announcementsFile = "announcements.json";

  // Cache stores for Local Simulation fallback
  private localUsers: User[] = [];
  private localProducts: Product[] = [];
  private localReviews: Review[] = [];
  private localOrders: Order[] = [];
  private localCoupons: Coupon[] = [];
  public announcements: Announcement[] = [];

  // Alias getter/setter to ensure admin.ts compiles perfectly
  get localAnnouncements() {
    return this.announcements;
  }
  set localAnnouncements(val: Announcement[]) {
    this.announcements = val;
  }

  constructor() {
    this.initLocal();
    connectMongoDB().then(() => {
      this.seedIfNeeded();
    });
  }

  private initLocal() {
    ensureDataDir();
    this.localUsers = this.loadLocalFile(this.usersFile, []);
    this.localProducts = this.loadLocalFile(this.productsFile, []);
    this.localReviews = this.loadLocalFile(this.reviewsFile, []);
    this.localOrders = this.loadLocalFile(this.ordersFile, []);
    this.localCoupons = this.loadLocalFile(this.couponsFile, []);
    this.announcements = this.loadLocalFile(this.announcementsFile, []);
  }

  private loadLocalFile<T>(filename: string, defaultValue: T): T {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      this.writeLocalFile(filename, defaultValue);
      return defaultValue;
    }
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error reading local simulated DB file: ${filename}`, e);
      return defaultValue;
    }
  }

  private writeLocalFile<T>(filename: string, data: T) {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error(`Error writing local simulated DB file: ${filename}`, e);
    }
  }

  // Seeding default catalog and users
  private async seedIfNeeded() {
    // Seed Coupons if empty
    const couponCount = isMongoConnected ? await MongoCoupon.countDocuments() : this.localCoupons.length;
    if (couponCount === 0) {
      const defaultCoupons: Coupon[] = [
        { code: "SHOPEZAI20", discountPercentage: 20, isActive: true },
        { code: "WELCOME10", discountPercentage: 10, isActive: true },
        { code: "FESTIVE30", discountPercentage: 30, isActive: true }
      ];
      if (isMongoConnected) {
        await MongoCoupon.insertMany(defaultCoupons);
      } else {
        this.localCoupons = defaultCoupons;
        this.writeLocalFile(this.couponsFile, this.localCoupons);
      }
      console.log("[ShopEZ AI DB] Seeded default coupons.");
    }

    // Seed Users if empty
    const userCount = isMongoConnected ? await MongoUser.countDocuments() : this.localUsers.length;
    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const customerHash = bcrypt.hashSync("customer123", salt);
      const sellerHash = bcrypt.hashSync("seller123", salt);
      const adminHash = bcrypt.hashSync("admin123", salt);

      const defaultUsers = [
        {
          name: "Alice Smith",
          email: "customer@shopez.com",
          passwordHash: customerHash,
          role: "CUSTOMER",
          address: { street: "123 Smart Alley", city: "Tech City", state: "Silicon", zip: "94016", country: "USA" },
          phone: "+1-555-0199",
          balance: 8500.0,
          wishlist: [],
          cart: [],
          createdAt: new Date().toISOString()
        },
        {
          name: "Viper Electronics Store",
          email: "seller@shopez.com",
          passwordHash: sellerHash,
          role: "SELLER",
          address: { street: "456 Vendor Plaza", city: "Commerce Town", state: "Retail", zip: "10001", country: "USA" },
          phone: "+1-555-0255",
          balance: 25000.0,
          wishlist: [],
          cart: [],
          createdAt: new Date().toISOString()
        },
        {
          name: "ShopEZ Admin Core",
          email: "admin@shopez.com",
          passwordHash: adminHash,
          role: "ADMIN",
          address: { street: "789 HQ Parkway", city: "Central Core", state: "SysOps", zip: "00001", country: "USA" },
          phone: "+1-555-0000",
          balance: 1000000.0,
          wishlist: [],
          cart: [],
          createdAt: new Date().toISOString()
        }
      ];

      if (isMongoConnected) {
        for (const u of defaultUsers) {
          const newUser = new MongoUser(u);
          await newUser.save();
        }
      } else {
        this.localUsers = defaultUsers.map((u, i) => ({ ...u, id: `usr_${i + 1}` }));
        this.writeLocalFile(this.usersFile, this.localUsers);
      }
      console.log("[ShopEZ AI DB] Seeded default users (Customer, Seller, Admin).");
    }

    // Seed Products if empty
    const productCount = isMongoConnected ? await MongoProduct.countDocuments() : this.localProducts.length;
    if (productCount === 0) {
      // Find a seller ID to associate
      let sellerId = "usr_2";
      if (isMongoConnected) {
        const dbSeller = await MongoUser.findOne({ role: "SELLER" });
        if (dbSeller) sellerId = dbSeller._id.toString();
      }

      const defaultProducts = [
        {
          title: "Viper Pro Mech Wireless Keyboard",
          description: "An enterprise-grade mechanical keyboard with hot-swappable tactile brown switches, double-shot PBT keycaps, customizable RGB backlighting, and dual-channel 2.4G/Bluetooth connectivity. Engineered for both high-velocity typing and professional software development.",
          price: 129.99,
          category: "Electronics",
          images: [
            "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&auto=format&fit=crop"
          ],
          variants: ["Carbon Black", "Mercury White"],
          stock: 45,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.8,
          createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString()
        },
        {
          title: "Aura Sound canceling Earbuds",
          description: "Premium wireless earbuds equipped with adaptive active noise cancellation (ANC), high-fidelity 11mm dynamic drivers, 36 hours of aggregate battery life with the wireless charging case, and IPX7 sweat resistance.",
          price: 189.50,
          category: "Electronics",
          images: [
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&auto=format&fit=crop"
          ],
          variants: ["Midnight Blue", "Platinum Silver"],
          stock: 60,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.6,
          createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
        },
        {
          title: "Aerotech Ultra Lightweight Sneakers",
          description: "Ergonomically engineered athletic shoes featuring a breathable knitted mesh upper, responsive multi-density memory foam insoles, and high-traction carbon rubber outsoles. Designed for runners who demand speed and premium impact cushioning.",
          price: 95.00,
          category: "Footwear",
          images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop"
          ],
          variants: ["Neon Red", "Cyber Yellow", "Stellar Gray"],
          stock: 120,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.5,
          createdAt: new Date(Date.now() - 10 * 24 * 3600000).toISOString()
        },
        {
          title: "Apex Horizon Smart Watch Pro",
          description: "A professional health and activity tracker featuring an always-on AMOLED display, blood oxygen saturation (SpO2) monitor, 24/7 heart rate tracking, built-in dual-frequency GPS, and up to 14 days of standalone battery efficiency.",
          price: 249.00,
          category: "Electronics",
          images: [
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&auto=format&fit=crop"
          ],
          variants: ["Titanium Gray", "Rose Gold Edition"],
          stock: 32,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.7,
          createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString()
        },
        {
          title: "Heritage Full-Grain Leather Satchel",
          description: "Handcrafted from vegetable-tanned full-grain leather, this vintage briefcase accommodates laptops up to 16 inches. Equipped with padded chambers, heavy-duty brass hardware, and a detachable padded shoulder harness.",
          price: 175.00,
          category: "Accessories",
          images: [
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop"
          ],
          variants: ["Chestnut Brown", "Vintage Tan"],
          stock: 18,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.9,
          createdAt: new Date(Date.now() - 15 * 24 * 3600000).toISOString()
        },
        {
          title: "Hyperion Smart Hydro Flask",
          description: "Double-walled vacuum insulated stainless steel smart bottle that tracks daily hydration metrics, sends glowing intake reminders, and monitors beverage temperature in real-time via a subtle lid display.",
          price: 49.99,
          category: "Accessories",
          images: [
            "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop"
          ],
          variants: ["Obsidian Black", "Forest Green", "Arctic Teal"],
          stock: 150,
          sellerId: sellerId,
          sellerName: "Viper Electronics Store",
          ratings: 4.2,
          createdAt: new Date(Date.now() - 12 * 24 * 3600000).toISOString()
        }
      ];

      if (isMongoConnected) {
        await MongoProduct.insertMany(defaultProducts);
      } else {
        this.localProducts = defaultProducts.map((p, i) => ({ ...p, id: `prod_${i + 1}` }));
        this.writeLocalFile(this.productsFile, this.localProducts);
      }
      console.log("[ShopEZ AI DB] Seeded default product catalog.");

      // Seed default reviews
      const products = isMongoConnected ? await MongoProduct.find() : this.localProducts;
      const customer = isMongoConnected ? await MongoUser.findOne({ role: "CUSTOMER" }) : this.localUsers[0];
      const customerId = customer ? (isMongoConnected ? customer._id.toString() : customer.id) : "usr_1";
      const customerName = customer ? customer.name : "Alice Smith";

      const defaultReviews: Review[] = [];
      products.forEach((p, idx) => {
        const prodId = isMongoConnected ? p._id.toString() : p.id;
        defaultReviews.push({
          id: `rev_${idx * 2 + 1}`,
          userId: customerId,
          userName: customerName,
          productId: prodId,
          rating: 5,
          comment: `Absolutely incredible product! The build quality of this ${p.title} is top-notch. Highly recommended for daily use.`,
          createdAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString()
        });
        defaultReviews.push({
          id: `rev_${idx * 2 + 2}`,
          userId: "usr_system",
          userName: "Tech Reviewer Bot",
          productId: prodId,
          rating: 4,
          comment: `Great performance overall. My only minor issue is the price point, but given the smart features, it is well worth the investment.`,
          createdAt: new Date(Date.now() - 4 * 24 * 3600000).toISOString()
        });
      });

      if (isMongoConnected) {
        await MongoReview.insertMany(defaultReviews.map(({ id, ...rest }) => rest));
      } else {
        this.localReviews = defaultReviews;
        this.writeLocalFile(this.reviewsFile, this.localReviews);
      }
      console.log("[ShopEZ AI DB] Seeded default reviews.");
    }

    // Seed Announcements
    const announceCount = isMongoConnected ? await MongoAnnouncement.countDocuments() : this.announcements.length;
    if (announceCount === 0) {
      const defaultAnnouncements: Announcement[] = [
        {
          id: "ann_1",
          title: "ShopEZ AI Platform Online",
          content: "Welcome to ShopEZ AI, your premier destination for modern, AI-powered e-commerce shopping. Chat with our smart Shopping Assistant available on every page to compare products, summarize reviews, search using your voice, or perform similarity matching using visual images!",
          date: new Date().toISOString(),
          category: "system"
        },
        {
          id: "ann_2",
          title: "Apex Horizon Smart Watch Pro Back in Stock",
          content: "Our highly demanded activity tracker watch is now fully restocked at Viper Electronics Store. Standardize your health dashboard metrics today!",
          date: new Date(Date.now() - 24 * 3600000).toISOString(),
          category: "news"
        }
      ];

      if (isMongoConnected) {
        await MongoAnnouncement.insertMany(defaultAnnouncements.map(({ id, ...rest }) => rest));
      } else {
        this.announcements = defaultAnnouncements;
        this.writeLocalFile(this.announcementsFile, this.announcements);
      }
      console.log("[ShopEZ AI DB] Seeded default announcements.");
    }
  }

  saveAnnouncements() {
    this.writeLocalFile(this.announcementsFile, this.announcements);
  }

  // -------------------------------------------------------------
  // Data Access Methods (Agnostic of Connection)
  // -------------------------------------------------------------

  // USER CRUD
  async getUsers(): Promise<User[]> {
    if (isMongoConnected) {
      const doc = await MongoUser.find();
      return doc.map(d => this.mapMongoUser(d));
    }
    return this.localUsers;
  }

  async getUserById(id: string): Promise<User | null> {
    if (isMongoConnected) {
      try {
        const doc = await MongoUser.findById(id);
        return doc ? this.mapMongoUser(doc) : null;
      } catch {
        return null;
      }
    }
    return this.localUsers.find(u => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (isMongoConnected) {
      const doc = await MongoUser.findOne({ email: email.toLowerCase().trim() });
      return doc ? this.mapMongoUser(doc) : null;
    }
    const emailLower = email.toLowerCase().trim();
    return this.localUsers.find(u => u.email.toLowerCase() === emailLower) || null;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    if (isMongoConnected) {
      const doc = new MongoUser(user);
      await doc.save();
      return this.mapMongoUser(doc);
    }
    const newUser: User = {
      ...user,
      id: "usr_" + Math.random().toString(36).substr(2, 9)
    };
    this.localUsers.push(newUser);
    this.writeLocalFile(this.usersFile, this.localUsers);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (isMongoConnected) {
      try {
        // Flatten fields if needed, mongoose handles basic updates directly
        const doc = await MongoUser.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return doc ? this.mapMongoUser(doc) : null;
      } catch {
        return null;
      }
    }
    const idx = this.localUsers.findIndex(u => u.id === id);
    if (idx < 0) return null;
    this.localUsers[idx] = { ...this.localUsers[idx], ...updates };
    this.writeLocalFile(this.usersFile, this.localUsers);
    return this.localUsers[idx];
  }

  // PRODUCT CRUD
  async getProducts(): Promise<Product[]> {
    if (isMongoConnected) {
      const doc = await MongoProduct.find();
      return doc.map(d => this.mapMongoProduct(d));
    }
    return this.localProducts;
  }

  async getProductById(id: string): Promise<Product | null> {
    if (isMongoConnected) {
      try {
        const doc = await MongoProduct.findById(id);
        return doc ? this.mapMongoProduct(doc) : null;
      } catch {
        return null;
      }
    }
    return this.localProducts.find(p => p.id === id) || null;
  }

  async createProduct(product: Omit<Product, "id" | "createdAt">): Promise<Product> {
    if (isMongoConnected) {
      const doc = new MongoProduct(product);
      await doc.save();
      return this.mapMongoProduct(doc);
    }
    const newProduct: Product = {
      ...product,
      id: "prod_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.localProducts.push(newProduct);
    this.writeLocalFile(this.productsFile, this.localProducts);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (isMongoConnected) {
      try {
        const doc = await MongoProduct.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return doc ? this.mapMongoProduct(doc) : null;
      } catch {
        return null;
      }
    }
    const idx = this.localProducts.findIndex(p => p.id === id);
    if (idx < 0) return null;
    this.localProducts[idx] = { ...this.localProducts[idx], ...updates };
    this.writeLocalFile(this.productsFile, this.localProducts);
    return this.localProducts[idx];
  }

  async deleteProduct(id: string): Promise<boolean> {
    if (isMongoConnected) {
      try {
        const res = await MongoProduct.findByIdAndDelete(id);
        return !!res;
      } catch {
        return false;
      }
    }
    const idx = this.localProducts.findIndex(p => p.id === id);
    if (idx < 0) return false;
    this.localProducts.splice(idx, 1);
    this.writeLocalFile(this.productsFile, this.localProducts);
    return true;
  }

  // REVIEW CRUD
  async getReviews(productId?: string): Promise<Review[]> {
    if (isMongoConnected) {
      const filter = productId ? { productId } : {};
      const doc = await MongoReview.find(filter).sort({ createdAt: -1 });
      return doc.map(d => this.mapMongoReview(d));
    }
    if (productId) {
      return this.localReviews.filter(r => r.productId === productId).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.localReviews;
  }

  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    if (isMongoConnected) {
      const doc = new MongoReview(review);
      await doc.save();
      const mapped = this.mapMongoReview(doc);
      // Recalculate average rating for product
      const reviews = await MongoReview.find({ productId: review.productId });
      const avg = reviews.length > 0 ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 5;
      await MongoProduct.findByIdAndUpdate(review.productId, { $set: { ratings: avg } });
      return mapped;
    }
    const newReview: Review = {
      ...review,
      id: "rev_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    this.localReviews.push(newReview);
    this.writeLocalFile(this.reviewsFile, this.localReviews);

    // Recalculate product rating
    const prodReviews = this.localReviews.filter(r => r.productId === review.productId);
    const avgRating = prodReviews.length > 0 ? parseFloat((prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1)) : 5;
    const prodIdx = this.localProducts.findIndex(p => p.id === review.productId);
    if (prodIdx >= 0) {
      this.localProducts[prodIdx].ratings = avgRating;
      this.writeLocalFile(this.productsFile, this.localProducts);
    }

    return newReview;
  }

  // ORDER CRUD
  async getOrders(userId?: string): Promise<Order[]> {
    if (isMongoConnected) {
      const filter = userId ? { userId } : {};
      const doc = await MongoOrder.find(filter).sort({ createdAt: -1 });
      return doc.map(d => this.mapMongoOrder(d));
    }
    if (userId) {
      return this.localOrders.filter(o => o.userId === userId).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.localOrders.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrderById(id: string): Promise<Order | null> {
    if (isMongoConnected) {
      try {
        const doc = await MongoOrder.findById(id);
        return doc ? this.mapMongoOrder(doc) : null;
      } catch {
        return null;
      }
    }
    return this.localOrders.find(o => o.id === id) || null;
  }

  async createOrder(order: Omit<Order, "id" | "createdAt" | "trackingNumber">): Promise<Order> {
    const trackingNumber = "TRK" + Math.floor(100000000 + Math.random() * 900000000);
    const orderData = { ...order, trackingNumber, createdAt: new Date().toISOString() };

    if (isMongoConnected) {
      const doc = new MongoOrder(orderData);
      await doc.save();
      return this.mapMongoOrder(doc);
    }

    const newOrder: Order = {
      ...orderData,
      id: "ord_" + Math.random().toString(36).substr(2, 9)
    };
    this.localOrders.push(newOrder);
    this.writeLocalFile(this.ordersFile, this.localOrders);
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    if (isMongoConnected) {
      try {
        const doc = await MongoOrder.findByIdAndUpdate(id, { $set: updates }, { new: true });
        return doc ? this.mapMongoOrder(doc) : null;
      } catch {
        return null;
      }
    }
    const idx = this.localOrders.findIndex(o => o.id === id);
    if (idx < 0) return null;
    this.localOrders[idx] = { ...this.localOrders[idx], ...updates };
    this.writeLocalFile(this.ordersFile, this.localOrders);
    return this.localOrders[idx];
  }

  // COUPON CRUD
  async getCouponByCode(code: string): Promise<Coupon | null> {
    if (isMongoConnected) {
      const doc = await MongoCoupon.findOne({ code: code.toUpperCase().trim() });
      return doc ? { code: doc.code, discountPercentage: doc.discountPercentage, isActive: doc.isActive } : null;
    }
    const target = code.toUpperCase().trim();
    return this.localCoupons.find(c => c.code === target) || null;
  }

  async getCoupons(): Promise<Coupon[]> {
    if (isMongoConnected) {
      const doc = await MongoCoupon.find();
      return doc.map(d => ({ code: d.code, discountPercentage: d.discountPercentage, isActive: d.isActive }));
    }
    return this.localCoupons;
  }

  // -------------------------------------------------------------
  // Helpers to map MongoDB Documents to standard TypeScript Models
  // -------------------------------------------------------------
  private mapMongoUser(doc: any): User {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.passwordHash,
      role: doc.role,
      address: doc.address || { street: "", city: "", state: "", zip: "", country: "" },
      phone: doc.phone || "",
      balance: doc.balance || 0,
      wishlist: doc.wishlist || [],
      cart: doc.cart || [],
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
    };
  }

  private mapMongoProduct(doc: any): Product {
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      price: doc.price,
      category: doc.category,
      images: doc.images || [],
      variants: doc.variants || [],
      stock: doc.stock,
      sellerId: doc.sellerId,
      sellerName: doc.sellerName,
      ratings: doc.ratings || 5,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
    };
  }

  private mapMongoReview(doc: any): Review {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      userName: doc.userName,
      productId: doc.productId,
      rating: doc.rating,
      comment: doc.comment,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
    };
  }

  private mapMongoOrder(doc: any): Order {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      userName: doc.userName,
      products: doc.products || [],
      totalAmount: doc.totalAmount,
      paymentMethod: doc.paymentMethod,
      paymentStatus: doc.paymentStatus,
      shippingAddress: doc.shippingAddress,
      status: doc.status,
      trackingNumber: doc.trackingNumber || "",
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
    };
  }
}

export const db = new ShopEZDatabase();
