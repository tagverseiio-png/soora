export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stock: number;
  lowStockAlert?: number;
  isActive: boolean;
  isFeatured: boolean;
  category: string;
  slug: string;
  description?: string;
  volume: string;
  abv: string;
  origin?: string;
  images: string[];
  thumbnail?: string;
  tags?: string[];
  viewCount?: number;
  salesCount?: number;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
  // For UI compatibility
  sku?: string;
  barcode?: string;
  searchTerms?: string;
  status?: string;
  margin?: number;
  rating?: number;
  reviews?: number;
  desc?: string;
  image?: string;
  time?: string;
};

export type Address = {
  id: string;
  userId: string;
  type: string;
  name?: string;
  street: string;
  unit?: string;
  building?: string;
  postalCode: string;
  district: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  deliveryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  addressId: string;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  notes?: string;
  cancelReason?: string;
  lalamoveOrderId?: string;
  lalamoveStatus?: string;
  lalamoveTrackingUrl?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createdAt?: string;
  updatedAt?: string;
  // For UI compatibility
  date?: string;
  items?: string;
  channel?: string;
};

export type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  password?: string;
  role: string;
  tier: string;
  dateOfBirth?: string;
  ageVerified: boolean;
  emailVerified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  addresses?: Address[];
  orders?: Order[];
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
