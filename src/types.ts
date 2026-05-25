export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  images?: string[];
  category?: string;
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
