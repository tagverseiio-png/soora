
const axios = require('axios');
const crypto = require('crypto');

// Mock Env
const API_SECRET = process.env.LALAMOVE_API_SECRET || 'test_secret';
const URL = 'http://localhost:3001/api/delivery/webhook';

const payload = {
  "apiKey": "pk_test_60230f8cf51f2a996389556d03eb9406",
  "timestamp": 1766915551,
  "signature": "cf7a215ded4e25b6d7b852194d1280b65bdd8af34feb93002f057f494a0aba75",
  "eventId": "B35F478A-2136-4566-9430-C419C2A8762F",
  "eventType": "DRIVER_ASSIGNED",
  "eventVersion": "v3",
  "data": {
    "driver": {
      "driverId": "80029",
      "phone": "+6522211222",
      "name": "TestDriver 11222",
      "photo": "",
      "plateNumber": "VP4388905"
    },
    "location": {
      "lng": 114.1763239,
      "lat": 22.3352951
    },
    "order": {
      "orderId": "3394517965935702476"
    },
    "updatedAt": "2025-12-28T17:52.00Z"
  }
};

async function testWebhook() {
    try {
        console.log('Sending webhook payload...');
        await axios.post(URL, payload, {
            headers: {
                'x-lalamove-timestamp': payload.timestamp,
                'x-lalamove-signature': payload.signature
            }
        });
        console.log('Webhook sent successfully!');
    } catch (e) {
        console.error('Error sending webhook:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', e.response.data);
        }
    }
}

testWebhook();
