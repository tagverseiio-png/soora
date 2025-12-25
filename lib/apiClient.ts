// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const DEFAULT_TIMEOUT = Number(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000');

export class ApiClientError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

export const apiClient = {
  baseUrl: API_BASE_URL,

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Inject auth token automatically
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}

    // Timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        throw new ApiClientError('Request timed out', 408);
      }
      throw new ApiClientError(err?.message || 'Network error', 0);
    }
    clearTimeout(timeout);

    if (!response.ok) {
      let errorMessage = response.statusText || 'Request failed';
      let errorData: any = undefined;
      try {
        const body = await response.json();
        errorData = body;
        if (body?.error) errorMessage = body.error;
        else if (body?.message) errorMessage = body.message;
      } catch (_) {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiClientError(errorMessage, response.status, errorData);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  },

  get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  },
  post<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch<T = any>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  },
  delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },
};
