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

    // Inject the caller's Firebase ID token automatically.
    //
    // Tokens are fetched (and transparently refreshed) from the Firebase SDK
    // rather than read from localStorage: ID tokens last ~1 hour, so caching
    // one would break long-lived sessions. A dynamic import keeps the Firebase
    // SDK out of any server-side bundle.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    try {
      if (typeof window !== 'undefined' && !headers['Authorization']) {
        const { getFirebaseIdToken } = await import('./firebase');
        const token = await getFirebaseIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
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
      const cloned = response.clone();
      let errorMessage = response.statusText || 'Request failed';
      let errorData: any = undefined;
      if (response.status === 401) {
        // Don't clear anything here: a 401 can mean "token expired mid-flight"
        // as well as "signed out". AuthContext reacts to the thrown error and
        // decides whether to end the session.
        // Prefer a clear message for auth failures
        errorMessage = 'Unauthorized. Please log in again.';
      }
      try {
        const body = await response.json();
        errorData = body;
        if (body?.error) errorMessage = body.error;
        else if (body?.message) errorMessage = body.message;
      } catch (_) {
        try {
          const text = await cloned.text();
          if (text) errorMessage = text;
        } catch (_) {
          // swallow secondary parse errors
        }
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
