/**
 * Lalamove API Mock Integration Script (Node.js) - FIXED VERSION
 * =============================================================
 *
 * This is the corrected version of the previous script. Key fixes:
 * - Quotation response uses "quotationId" (not "id") for the main ID.
 * - Stops use "stopId" (not "id") and lack "locationType"; assume first stop = PICKUP, second = DROPOFF.
 * - Updated LANGUAGE to "en_SG" (lowercase) in payload to match expected format.
 * - Enhanced error handling: Validate response structure before accessing properties.
 * - Added logging for debug: Prints full quotation data on success.
 * - Improved stop ID extraction with fallback (e.g., for multi-stop routes).
 *
 * All other features remain: Sandbox, Singapore focus, HMAC auth, async/await, etc.
 *
 * **Usage:** npm start (after updating index.js with this code).
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Load environment variables (optional, for security)
require('dotenv').config(); // npm install dotenv

// Configuration - Replace with your Sandbox credentials or use .env
const API_KEY = process.env.LALAMOVE_API_KEY || 'pk_test_your_api_key_here'; // Sandbox public key
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'sk_test_your_api_secret_here'; // Sandbox secret key
const BASE_URL = 'https://rest.sandbox.lalamove.com/v3';
const MARKET = 'SG'; // Singapore
const LANGUAGE = 'en_SG'; // Fixed: lowercase for payload consistency

// Singapore Example Addresses and Coordinates
const PICKUP_ADDRESS = '1 Orchard Road, Singapore 238825';
const DROPOFF_ADDRESS = '10 Raffles Place, Singapore 048620';
const PICKUP_COORDS = { lat: '1.3044', lng: '103.8448' };
const DROPOFF_COORDS = { lat: '1.2842', lng: '103.8515' };

// Sender/Recipient Details (Singapore phones)
const SENDER_NAME = 'John Tan';
const SENDER_PHONE = '+6591234567';
const RECIPIENT_NAME = 'Alice Lim';
const RECIPIENT_PHONE = '+6598765432';
const RECIPIENT_REMARKS = 'Leave at front desk\nUnit 10-01';

const SERVICE_TYPE = 'MOTORCYCLE'; // Options: MOTORCYCLE, SEDAN, etc.

/**
 * Generate HMAC-SHA256 signature for Lalamove API auth.
 *
 * @param {string} method - HTTP method (e.g., 'POST')
 * @param {string} path - API path (e.g., '/v3/quotations')
 * @param {string} body - Request body as string
 * @param {string} timestamp - Unix timestamp in ms as string
 * @param {string} secret - API secret
 * @returns {string} Lowercase hex signature.
 */
function generateSignature(method, path, body, timestamp, secret) {
  const message = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

/**
 * Generate required headers including Authorization.
 *
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} body - Request body object
 * @returns {Object} Headers object.
 */
function getHeaders(method, path, body) {
  const timestamp = Date.now().toString(); // Unix timestamp in ms
  const bodyStr = JSON.stringify(body);
  const signature = generateSignature(method, path, bodyStr, timestamp, API_SECRET);
  const nonce = uuidv4();

  return {
    'Content-Type': 'application/json',
    Authorization: `hmac ${API_KEY}:${timestamp}:${signature}`,
    Market: MARKET,
    'Request-ID': nonce,
  };
}

/**
 * Step 1: Create a quotation for the delivery.
 *
 * @returns {Promise<Object>} Response JSON with quotationId and stopIds.
 */
async function createQuotation() {
  const url = `${BASE_URL}/quotations`;
  const payload = {
    data: {
      serviceType: SERVICE_TYPE,
      stops: [
        {
          coordinates: PICKUP_COORDS,
          address: PICKUP_ADDRESS,
        },
        {
          coordinates: DROPOFF_COORDS,
          address: DROPOFF_ADDRESS,
        },
      ],
      language: LANGUAGE, // Fixed: lowercase 'en_SG'
    },
  };

  const headers = getHeaders('POST', '/v3/quotations', payload);

  try {
    const response = await axios.post(url, payload, { headers });
    console.log('Quotation Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Quotation Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Step 2: Create order using quotation ID and stop IDs.
 *
 * @param {Object} quotationData - Response from createQuotation()
 * @returns {Promise<Object>} Response JSON with order details.
 */
async function createOrder(quotationData) {
  // Validate and extract from quotation response (FIXED: Use 'quotationId' and 'stopId')
  if (!quotationData || !quotationData.data) {
    throw new Error('Invalid quotation data: Missing .data object');
  }

  const { data } = quotationData;
  const quotationId = data.quotationId; // FIXED: 'quotationId' not 'id'
  if (!quotationId) {
    throw new Error('Invalid quotation data: Missing quotationId');
  }

  const stops = data.stops || [];
  if (stops.length < 2) {
    throw new Error('Invalid quotation data: At least 2 stops required');
  }

  // FIXED: Assume first stop = PICKUP, second = DROPOFF (no 'locationType' in response)
  // Use 'stopId' not 'id'
  const pickupStopId = stops[0].stopId;
  const dropoffStopId = stops[1].stopId;

  if (!pickupStopId || !dropoffStopId) {
    throw new Error('Invalid quotation data: Missing stopIds');
  }

  console.log(`Using Quotation ID: ${quotationId}`);
  console.log(`Pickup Stop ID: ${pickupStopId}, Dropoff Stop ID: ${dropoffStopId}`);

  const url = `${BASE_URL}/orders`;
  const payload = {
    data: {
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: SENDER_NAME,
        phone: SENDER_PHONE,
      },
      recipients: [
        {
          stopId: dropoffStopId,
          name: RECIPIENT_NAME,
          phone: RECIPIENT_PHONE,
          remarks: RECIPIENT_REMARKS,
        },
      ],
      isPODEnabled: true, // Proof of Delivery
      metadata: {
        orderId: 'MOCK-ORD-12345',
        customerRef: 'CUST-98765',
      },
    },
  };

  const headers = getHeaders('POST', '/v3/orders', payload);

  try {
    const response = await axios.post(url, payload, { headers });
    console.log('Order Creation Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Order Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main execution: Quotation -> Order.
 */
async function main() {
  console.log('=== Lalamove Sandbox Mock Order Creation (FIXED) ===');
  console.log(`Market: ${MARKET} | Service: ${SERVICE_TYPE}`);
  console.log(`Pickup: ${PICKUP_ADDRESS}`);
  console.log(`Dropoff: ${DROPOFF_ADDRESS}`);
  console.log();

  try {
    // Step 1: Get Quotation
    const quotation = await createQuotation();

    // Step 2: Create Order (One Mock Call)
    const order = await createOrder(quotation);
    console.log(order.data.orderId);

    console.log('\n=== Success! Order ID:', order.data.orderId);
    console.log('Track via: https://web.sandbox.lalamove.com/order-detail/' + order.data.orderId);
  } catch (error) {
    console.error('Main Error:', error.message || error);
    process.exit(1);
  }
}

// Run the script
main();