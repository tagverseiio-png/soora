export type Product = {
  id: string; // Changed from number to string to match UUID
  name: string;
  brand: string;
  price: number;
  stock: number;
  status?: string; // Optional in backend response sometimes
  margin?: number;
  rating?: number;
  reviews?: any[]; // Prisma include
  category: string;
  volume: string;
  abv: string;
  desc?: string; // Optional
  description?: string; // Backend uses description
  image?: string; // Backend uses images[] and thumbnail
  thumbnail?: string;
  images?: string[];
  tags: string[];
  time?: string;
  isActive?: boolean;
};

export type Address = {
  id: string; // UUID
  type: string;
  text?: string; // Frontend legacy
  street?: string; // Backend
  unit?: string;
  postalCode?: string;
  isDefault: boolean;
};

export type Order = {
  id: string;
  date?: string; // Frontend legacy
  createdAt?: string; // Backend
  total: number;
  items: any; // Simplified for now
  status: string;
  customer?: string; // For admin view
  channel?: string;
  placed?: string;
};

export type User = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  addresses: Address[];
  orders: Order[];
  role?: string;
};
