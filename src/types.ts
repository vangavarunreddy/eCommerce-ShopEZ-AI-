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
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  address: UserAddress;
  phone: string;
  balance: number;
  wishlist: string[];
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
  ratings: number;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
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

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  comparisonReport?: boolean;
}

export interface SuspiciousAudit {
  userId: string;
  name: string;
  email: string;
  reason: string;
  severity: "critical" | "warning";
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: "news" | "maintenance" | "system";
}
