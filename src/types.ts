export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  images?: string[];
  category?: string;
  sizes?: string[];
  time: number;
}

export interface PaymentSettings {
  bkash: string;
  nagad: string;
  bank: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  deliveryInside?: number;
  deliveryOutside?: number;
  footerDeveloperName?: string;
  footerWhatsapp?: string;
  footerEmail?: string;
  footerFacebook?: string;
  footerOfficeAddress?: string;
  footerTagline?: string;
}

export interface Order {
  id: string;
  trackingNumber?: string;
  productName: string;
  productPrice: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  deliveryCharge: number;
  status: "Pending" | "Delivered" | "Shipped" | "Returned" | string;
  paymentMethod?: "COD" | "bKash" | "Nagad" | string;
  transactionId?: string;
  size?: string;
  selectedSize?: string;
  time: number;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: number;
  images?: string[];
}

export interface PromoCode {
  id: string;
  code: string;
  type: "flat" | "percentage";
  value: number;
  minPurchase: number;
  expiryDate: string;
  active: boolean;
  createdAt: number;
}
