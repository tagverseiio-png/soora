import { apiClient } from './apiClient';
import { Product, Order, User } from './types';

// Products
export const getProducts = async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return apiClient.request<{ products: Product[], pagination: any }>(`/products?${queryParams}`);
};

export const getProduct = async (id: string) => {
    return apiClient.request<Product>(`/products/${id}`);
};

export const getFeaturedProducts = async () => {
    return apiClient.request<Product[]>('/products/featured/list');
};

export const getCategories = async () => {
    return apiClient.request<any[]>('/products/categories/list');
};

// Admin
export const getAdminStats = async () => {
    return apiClient.request<any>('/admin/stats');
};

export const getAdminInventory = async () => {
    // Assuming there's an endpoint for full inventory or re-using getProducts
    return apiClient.request<{ products: Product[] }>('/products?limit=100');
};

// Orders
export const createOrder = async (orderData: any) => {
    return apiClient.request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
};

export const getMyOrders = async () => {
    return apiClient.request<Order[]>('/orders/my-orders');
};

// User
export const updateProfile = async (userData: Partial<User>) => {
    return apiClient.request<User>('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
};
