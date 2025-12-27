import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

interface LalamoveLocation {
  lat: string;
  lng: string;
  address: string;
}

interface LalamoveStop {
  location: LalamoveLocation;
  name?: string;
  phone?: string;
  remarks?: string;
}

interface LalamoveQuoteRequest {
  serviceType: string;
  stops: LalamoveStop[];
  language?: string;
  scheduleAt?: string; // ISO 8601 UTC, optional
  specialRequests?: string[]; // optional per-market
  isRouteOptimized?: boolean; // optional
  item?: {
    quantity?: string;
    weight?: string; // e.g., LESS_THAN_3KG
    categories?: string[];
    handlingInstructions?: string[];
  };
}

interface LalamoveOrderData {
  quotationId: string;
  sender: {
    stopId: string;
    name: string;
    phone: string;
  };
  recipients: Array<{
    stopId: string;
    name: string;
    phone: string;
    remarks?: string;
  }>;
  isPODEnabled?: boolean;
  partner?: string;
  metadata?: Record<string, string>;
}

export class LalamoveService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private market: string;
  private client: AxiosInstance;

  constructor() {
    this.apiKey = process.env.LALAMOVE_API_KEY!;
    this.apiSecret = process.env.LALAMOVE_API_SECRET!;
    // Default to sandbox in non-production environments
    const defaultBase = (process.env.NODE_ENV === 'production')
      ? 'https://rest.lalamove.com'
      : 'https://rest.sandbox.lalamove.com';
    this.baseUrl = process.env.LALAMOVE_BASE_URL || defaultBase;
    this.market = process.env.LALAMOVE_MARKET || 'SG';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Missing Lalamove API credentials. Set LALAMOVE_API_KEY and LALAMOVE_API_SECRET in environment.');
    }
  }

  /**
   * Generate signature for Lalamove API authentication
   */
  private generateSignature(
    timestamp: string,
    method: string,
    path: string,
    body: string = ''
  ): string {
    const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Get delivery quotation
   */
  async getQuotation(request: LalamoveQuoteRequest) {
    try {
      const timestamp = Date.now().toString();
      const method = 'POST';
      const path = `/v3/quotations`;
      // Derive sensible defaults
      const derivedLanguage = 'en';
      const enriched: LalamoveQuoteRequest = {
        language: request.language || derivedLanguage,
        isRouteOptimized: request.isRouteOptimized ?? true,
        // Omit item to minimize schema issues in sandbox; can re-enable later
        serviceType: request.serviceType,
        stops: request.stops,
        scheduleAt: request.scheduleAt,
        specialRequests: request.specialRequests,
      };

      const payload = { data: enriched };
      const body = JSON.stringify(payload);

      const signature = this.generateSignature(timestamp, method, path, body);

      console.log('[Lalamove] Quotation Request:', {
        url: `${this.baseUrl}${path}`,
        method,
        timestamp,
        market: this.market,
        body: payload,
      });

      const response = await this.client.post(path, payload, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Content-Type': 'application/json',
          'MARKET': this.market,
          'Request-ID': crypto.randomUUID(),
        },
      });

      console.log('[Lalamove] Quotation Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[Lalamove] Quotation Error:', {
        status: error.response?.status,
        data: error.response?.data ? JSON.stringify(error.response.data, null, 2) : undefined,
        message: error.message,
      });
      throw new Error(`Failed to get delivery quotation: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create delivery order
   */
  async createOrder(request: LalamoveOrderData) {
    try {
      const timestamp = Date.now().toString();
      const method = 'POST';
      const path = `/v3/orders`;
      // Orders API expects payload wrapped under `data`
      const payload = { data: request };
      const body = JSON.stringify(payload);

      const signature = this.generateSignature(timestamp, method, path, body);

      const response = await this.client.post(path, payload, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Content-Type': 'application/json',
          'MARKET': this.market,
          'Request-ID': crypto.randomUUID(),
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Lalamove order creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create delivery order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    try {
      const timestamp = Date.now().toString();
      const method = 'GET';
      const path = `/v3/orders/${orderId}`;

      const signature = this.generateSignature(timestamp, method, path);

      const response = await this.client.get(path, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Market': this.market,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Lalamove order details error:', error.response?.data || error.message);
      throw new Error(`Failed to get order details: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cancel delivery order
   */
  async cancelOrder(orderId: string) {
    try {
      const timestamp = Date.now().toString();
      const method = 'PUT';
      const path = `/v3/orders/${orderId}/cancel`;

      const signature = this.generateSignature(timestamp, method, path);

      const response = await this.client.put(
        path,
        {},
        {
          headers: {
            'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
            'Market': this.market,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Lalamove order cancellation error:', error.response?.data || error.message);
      throw new Error(`Failed to cancel order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get driver location
   */
  async getDriverLocation(orderId: string) {
    try {
      const timestamp = Date.now().toString();
      const method = 'GET';
      const path = `/v3/orders/${orderId}/drivers`;

      const signature = this.generateSignature(timestamp, method, path);

      const response = await this.client.get(path, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Market': this.market,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Lalamove driver location error:', error.response?.data || error.message);
      throw new Error(`Failed to get driver location: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Calculate delivery estimate for Singapore
   */
  async getDeliveryEstimate(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    pickupAddress: string,
    dropoffAddress: string,
    optimizeRoute: boolean = true
  ) {
    const request: LalamoveQuoteRequest = {
      serviceType: 'MOTORCYCLE', // Options: MOTORCYCLE, CAR, VAN
      stops: [
        {
          location: {
            lat: pickupLat.toString(),
            lng: pickupLng.toString(),
            address: pickupAddress,
          },
          name: 'Soora Store',
          phone: process.env.STORE_PHONE || '+6590000000',
        },
        {
          location: {
            lat: dropoffLat.toString(),
            lng: dropoffLng.toString(),
            address: dropoffAddress,
          },
          name: 'Recipient',
        },
      ],
      language: this.market === 'SG' ? 'en_SG' : 'en_HK',
      isRouteOptimized: optimizeRoute,
    };

    return this.getQuotation(request);
  }
}

export const lalamoveService = new LalamoveService();
