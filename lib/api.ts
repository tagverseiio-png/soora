import { apiClient, ApiClientError } from './apiClient';
import { Product, Order } from './types';

// ============= ADDITIONAL TYPE DEFINITIONS =============

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  tier: string;
  ageVerified?: boolean;
  emailVerified?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationInfo;
}

export interface Address {
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
  isDefault: boolean;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  volume: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CreateOrderPayload {
  addressId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: 'STRIPE' | 'CASH_ON_DELIVERY';
  deliveryNotes?: string;
}

export interface CreateOrderResponse {
  order: Order;
  clientSecret?: string;
}

// ============= API SERVICES =============

/**
 * Authentication API
 */
export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', { email, password });
  },

  async register(
    email: string,
    password: string,
    data?: { name?: string; phone?: string; dateOfBirth?: string }
  ): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      ...data,
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  async logout(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/logout', {});
  },
};

/**
 * Products API
 */
export const productsApi = {
  async getAll(params?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }): Promise<ProductsResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return apiClient.get<ProductsResponse>(
      `/products${queryString ? `?${queryString}` : ''}`
    );
  },

  async getById(id: string): Promise<Product> {
    return apiClient.get<Product>(`/products/${id}`);
  },

  async getFeatured(): Promise<Product[]> {
    return apiClient.get<Product[]>('/products/featured/list');
  },

  async getCategories(): Promise<any[]> {
    return apiClient.get<any[]>('/products/categories/list');
  },
};

/**
 * Orders API
 */
export const ordersApi = {
  async create(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
    return apiClient.post<CreateOrderResponse>('/orders', payload);
  },

  async getMyOrders(): Promise<Order[]> {
    return apiClient.get<Order[]>('/orders/my-orders');
  },

  async getById(id: string): Promise<Order> {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  async cancel(id: string, reason?: string): Promise<Order> {
    return apiClient.put<Order>(`/orders/${id}/cancel`, { reason });
  },
};

/**
 * Users API
 */
export const usersApi = {
  async getProfile(): Promise<User> {
    return apiClient.get<User>('/users/profile');
  },

  async updateProfile(data: { name?: string; phone?: string }): Promise<User> {
    return apiClient.put<User>('/users/profile', data);
  },

  async getAddresses(): Promise<Address[]> {
    return apiClient.get<Address[]>('/users/addresses');
  },

  async createAddress(address: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'city' | 'country'>): Promise<Address> {
    return apiClient.post<Address>('/users/addresses', address);
  },

  async updateAddress(id: string, address: Partial<Address>): Promise<Address> {
    return apiClient.put<Address>(`/users/addresses/${id}`, address);
  },

  async deleteAddress(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/users/addresses/${id}`);
  },
};

/**
 * Payments API
 */
export const paymentsApi = {
  async createPaymentIntent(orderId: string): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    return apiClient.post<{
      clientSecret: string;
      paymentIntentId: string;
    }>('/payments/create-intent', { orderId });
  },
};

/**
 * Delivery API
 */
export const deliveryApi = {
  async getQuote(addressId: string): Promise<any> {
    return apiClient.post<any>('/delivery/quote', { addressId });
  },

  async trackOrder(orderId: string): Promise<any> {
    return apiClient.get<any>(`/delivery/track/${orderId}`);
  },

  async getDriverLocation(orderId: string): Promise<any> {
    return apiClient.get<any>(`/delivery/driver/${orderId}`);
  },
};

/**
 * Admin API
 */
export const adminApi = {
  // Products
  async createProduct(product: any): Promise<Product> {
    return apiClient.post<Product>('/admin/products', product);
  },

  async updateProduct(id: string, product: any): Promise<Product> {
    return apiClient.put<Product>(`/admin/products/${id}`, product);
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/admin/products/${id}`);
  },

  async updateStock(id: string, stock: number): Promise<Product> {
    return apiClient.put<Product>(`/admin/products/${id}/stock`, { stock });
  },

  // Orders
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: Order[]; pagination: PaginationInfo }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return apiClient.get<{ orders: Order[]; pagination: PaginationInfo }>(
      `/admin/orders${queryString ? `?${queryString}` : ''}`
    );
  },

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    return apiClient.put<Order>(`/admin/orders/${id}/status`, { status });
  },

  // Users
  async getUsers(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ users: User[]; pagination: PaginationInfo }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return apiClient.get<{ users: User[]; pagination: PaginationInfo }>(
      `/admin/users${queryString ? `?${queryString}` : ''}`
    );
  },

  async updateUserTier(id: string, tier: string): Promise<User> {
    return apiClient.put<User>(`/admin/users/${id}/tier`, { tier });
  },

  // Analytics
  async getStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    totalUsers: number;
    lowStockProducts: number;
  }> {
    return apiClient.get<{
      totalOrders: number;
      pendingOrders: number;
      totalRevenue: number;
      totalUsers: number;
      lowStockProducts: number;
    }>('/admin/stats');
  },

  async getSalesReport(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    orders: Order[];
  }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return apiClient.get<{
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      orders: Order[];
    }>(`/admin/reports/sales${queryString ? `?${queryString}` : ''}`);
  },
};

/**
 * Centralized error handler
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// ============= LEGACY EXPORTS (for backward compatibility) =============
export const getProducts = productsApi.getAll;
export const getProduct = productsApi.getById;
export const getFeaturedProducts = productsApi.getFeatured;
export const getCategories = productsApi.getCategories;
export const getAdminStats = adminApi.getStats;
export const getAdminInventory = async () => productsApi.getAll({ limit: 100 });
export const createOrder = ordersApi.create;
export const getMyOrders = ordersApi.getMyOrders;
export const updateProfile = usersApi.updateProfile;
