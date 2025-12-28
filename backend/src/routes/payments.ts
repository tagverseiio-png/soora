import express, { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { lalamoveService } from '../services/lalamove.service';
import { geocodeSingaporeAddress } from '../utils/geocode';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Store Location (Default to Orchard Road if not set)
const STORE_LAT = parseFloat(process.env.STORE_LAT || '1.3044');
const STORE_LNG = parseFloat(process.env.STORE_LNG || '103.8448');
const STORE_ADDRESS = process.env.STORE_ADDRESS || '1 Orchard Road, Singapore 238825';

// Helper: Trigger Lalamove Delivery
async function triggerLalamoveDelivery(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { address: true, user: true },
    });

    if (!order) {
      console.error(`[Lalamove] Order ${orderId} not found.`);
      return;
    }

    // 1. Ensure User Address Coordinates
    let { latitude, longitude } = order.address;
    if (!latitude || !longitude) {
      console.log(`[Lalamove] Geocoding address for Order ${orderId}...`);
      const geo = await geocodeSingaporeAddress(order.address.street, order.address.postalCode);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lng;
        // Update address with coords for future use
        await prisma.address.update({
          where: { id: order.addressId },
          data: { latitude, longitude },
        });
      } else {
        console.error(`[Lalamove] Failed to geocode address for Order ${orderId}. Cannot create delivery.`);
        return;
      }
    }

    // 2. Get Quotation
    console.log(`[Lalamove] Requesting quotation for Order ${orderId}...`);
    const quoteResponse = await lalamoveService.getDeliveryEstimate(
      STORE_LAT,
      STORE_LNG,
      latitude!,
      longitude!,
      STORE_ADDRESS,
      `${order.address.street} ${order.address.unit || ''}, Singapore ${order.address.postalCode}`
    );

    const quotationId = quoteResponse.data?.quotationId;
    const stops = quoteResponse.data?.stops;

    if (!quotationId || !stops || stops.length < 2) {
      console.error(`[Lalamove] Invalid quotation response for Order ${orderId}:`, JSON.stringify(quoteResponse));
      return;
    }

    const pickupStopId = stops[0].stopId;
    const dropoffStopId = stops[1].stopId;

    // 3. Create Order
    console.log(`[Lalamove] Creating delivery order for Order ${orderId}...`);
    const deliveryOrder = await lalamoveService.createOrder({
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: 'Soora Store',
        phone: process.env.STORE_PHONE || '+6590000000',
      },
      recipients: [
        {
          stopId: dropoffStopId,
          name: order.customerName,
          phone: order.customerPhone,
          remarks: order.deliveryNotes || 'Fragile - Alcohol',
        },
      ],
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    const lalamoveOrderId = deliveryOrder.data?.orderId;
    console.log(`[Lalamove] Delivery created! ID: ${lalamoveOrderId}`);

    // 4. Update Order Record
    await prisma.order.update({
      where: { id: orderId },
      data: {
        lalamoveOrderId,
        lalamoveStatus: 'ASSIGNING_DRIVER', // Initial status
      },
    });

  } catch (error: any) {
    console.error(`[Lalamove] Failed to trigger delivery for Order ${orderId}:`, error.message);
  }
}

// Create payment intent
router.post('/create-intent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const paymentIntent = await stripeService.createPaymentIntent(
      order.total,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: req.user!.id,
      }
    );

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: paymentIntent.id },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Stripe Checkout Session (hosted, PayNow + cards)
router.post('/checkout-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const successUrl = `${FRONTEND_URL}/order-success?orderId=${order.id}`;
    const cancelUrl = `${FRONTEND_URL}/checkout?orderId=${order.id}`;

    const session = await stripeService.createCheckoutSession({
      amount: order.total,
      successUrl,
      cancelUrl,
      customerEmail: req.user?.email,
      orderNumber: order.orderNumber,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: req.user!.id,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
// Stripe requires raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripeService.verifyWebhookSignature(
      req.body,
      sig
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session: any = event.data.object;
        const orderId = session?.metadata?.orderId as string | undefined;
        const paymentIntentId = session?.payment_intent as string | undefined;

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: 'COMPLETED',
              status: 'CONFIRMED',
              ...(paymentIntentId && { stripePaymentId: paymentIntentId }),
            },
          });
          console.log('Checkout session completed for order:', orderId);
          // Trigger Lalamove
          triggerLalamoveDelivery(orderId);
        }
        break;
      }
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId; // Usually in metadata
        
        // Update order status
        // Note: updateMany doesn't return the records, so we find first if orderId missing
        if (orderId) {
             await prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentStatus: 'COMPLETED',
                    status: 'CONFIRMED',
                }
             });
             console.log('Payment succeeded for order:', orderId);
             triggerLalamoveDelivery(orderId);
        } else {
            // Fallback: find by payment intent
            const orders = await prisma.order.findMany({
              where: { stripePaymentId: paymentIntent.id },
            });
            
            await prisma.order.updateMany({
              where: { stripePaymentId: paymentIntent.id },
              data: {
                paymentStatus: 'COMPLETED',
                status: 'CONFIRMED',
              },
            });
            console.log('Payment succeeded:', paymentIntent.id);
            
            // Trigger Lalamove for found orders
            for (const o of orders) {
                triggerLalamoveDelivery(o.id);
            }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        await prisma.order.updateMany({
          where: { stripePaymentId: failedPayment.id },
          data: {
            paymentStatus: 'FAILED',
          },
        });
        
        console.log('Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

export default router;
