import { Router } from 'express';
import { lalamoveService } from '../services/lalamove.service';
import { authenticate, authorizeRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { geocodeSingaporeAddress } from '../utils/geocode';

const router = Router();

// Get delivery quotation
router.post('/quote', authenticate, async (req: AuthRequest, res) => {
  try {
    const { addressId } = req.body;

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Validate SG address
    if (!address.postalCode || !/^\d{6}$/.test(address.postalCode)) {
      return res.status(400).json({ error: 'Invalid Singapore postal code. Please provide a 6-digit postal code.' });
    }
    if (!address.street || address.street.trim().length < 3) {
      return res.status(400).json({ error: 'Invalid street address. Please provide a full street address.' });
    }

    // Determine coordinates, geocoding when missing; normalize address string
    let lat = address.latitude || 0;
    let lng = address.longitude || 0;
    let dropoffAddress = `${address.street}, Singapore ${address.postalCode}`;
    if (!address.latitude || !address.longitude) {
      const geo = await geocodeSingaporeAddress(address.street, address.postalCode);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        dropoffAddress = geo.displayName;
      } else {
        lat = 1.3521; // Singapore center
        lng = 103.8198;
      }
    }

    // Store/warehouse location (you should set this in env or database)
    const storeLocation = {
      lat: 1.3521, // Example: Singapore Central
      lng: 103.8198,
      address: 'Soora Warehouse, Singapore',
    };

    let quotation;
    try {
      quotation = await lalamoveService.getDeliveryEstimate(
        storeLocation.lat,
        storeLocation.lng,
        lat,
        lng,
        storeLocation.address,
        dropoffAddress
      );
    } catch (err: any) {
      // Retry without route optimization if address error
      console.error('[Delivery Quote] Initial quotation failed:', err?.message);
      quotation = await lalamoveService.getDeliveryEstimate(
        storeLocation.lat,
        storeLocation.lng,
        lat,
        lng,
        storeLocation.address,
        dropoffAddress,
        false // no route optimization
      );
    }

    // Extract delivery fee from quotation
    const deliveryFee = (quotation as any)?.quotedTotalFee?.amount 
      ? parseFloat((quotation as any).quotedTotalFee.amount) / 100 
      : parseFloat(process.env.DELIVERY_FEE || '5');
    const estimatedTime = (quotation as any)?.estimatedTimeTaken || null;

    res.json({
      quotation,
      deliveryFee,
      estimatedTime,
      currency: (quotation as any)?.quotedTotalFee?.currency || 'SGD',
      addressId,
      usedAddress: dropoffAddress,
      usedCoordinates: { lat, lng },
    });
  } catch (error: any) {
    console.error('Delivery quote error:', error.message);
    // Fallback to default delivery fee on error
    const fallbackFee = parseFloat(process.env.DELIVERY_FEE || '5');
    res.json({
      quotation: null,
      deliveryFee: fallbackFee,
      estimatedTime: null,
      currency: 'SGD',
      addressId: req.body.addressId,
      error: 'Using default delivery fee due to service unavailable',
    });
  }
});

// Create delivery order (Admin only)
router.post('/create', authenticate, authorizeRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        user: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Determine dropoff coordinates (geocode when missing)
    let deliveryLat = order.address.latitude || 0;
    let deliveryLng = order.address.longitude || 0;
    let deliveryAddressStr = `${order.address.street}, Singapore ${order.address.postalCode}`;
    if (!order.address.latitude || !order.address.longitude) {
      const geo = await geocodeSingaporeAddress(order.address.street, order.address.postalCode);
      if (geo) {
        deliveryLat = geo.lat;
        deliveryLng = geo.lng;
        deliveryAddressStr = geo.displayName;
      } else {
        deliveryLat = 1.3521;
        deliveryLng = 103.8198;
      }
    }

      // Store location from env with geocoding
      const storeName = process.env.STORE_NAME || 'Soora Store';
      const storeAddrInput = process.env.STORE_ADDRESS || 'Singapore';
      const storePostal = process.env.STORE_POSTAL || '';
      const storeGeo = await geocodeSingaporeAddress(storeAddrInput, storePostal);
      const storeLat = (storeGeo?.lat ?? 1.3521).toString();
      const storeLng = (storeGeo?.lng ?? 103.8198).toString();
      const storeAddress = storeGeo?.displayName ?? (storePostal ? `${storeAddrInput}, Singapore ${storePostal}` : `${storeAddrInput}, Singapore`);

    // Get quotation first (and surface detailed errors if any)
    let quotation: any;
    try {
        quotation = await lalamoveService.getDeliveryEstimate(
          parseFloat(storeLat),
          parseFloat(storeLng),
          deliveryLat,
          deliveryLng,
          storeAddress,
          deliveryAddressStr
        );
    } catch (err: any) {
      console.error('[Delivery Create] Quotation failed:', err?.message);
      return res.status(500).json({ error: err?.message || 'Quotation failed' });
    }

    // Extract quotationId and stopIds for order creation
    const quotationId = (quotation as any)?.quotationId || (quotation as any)?.data?.quotationId;
    const quotationStops = (quotation as any)?.stops || (quotation as any)?.data?.stops || [];
    const pickupStopId = quotationStops[0]?.stopId;
    const dropoffStopId = quotationStops[1]?.stopId;

    if (!quotationId || !pickupStopId || !dropoffStopId) {
      return res.status(500).json({ error: 'Invalid quotation response: missing quotationId or stopIds' });
    }

    // Create delivery order using quotationId and stop references
    const deliveryOrder = await lalamoveService.createOrder({
      quotationId,
      sender: {
        stopId: pickupStopId,
        name: 'Soora Store',
        phone: process.env.STORE_PHONE || '+6512345678',
      },
      recipients: [
        {
          stopId: dropoffStopId,
          name: order.customerName,
          phone: order.customerPhone,
          remarks: order.deliveryNotes || '',
        },
      ],
    });

    const trackingUrl = (deliveryOrder as any)?.shareLink || (deliveryOrder as any)?.data?.shareLink || null;
    const deliveryStatus = (deliveryOrder as any)?.status || (deliveryOrder as any)?.data?.status || 'OUT_FOR_DELIVERY';

    // Update order with Lalamove details
    await prisma.order.update({
      where: { id: orderId },
      data: {
        lalamoveOrderId: deliveryOrder.orderId,
        lalamoveStatus: deliveryStatus,
        lalamoveTrackingUrl: trackingUrl,
        status: 'OUT_FOR_DELIVERY',
      },
    });

    res.json({
      ...deliveryOrder,
      shareLink: trackingUrl,
      status: deliveryStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery status
router.get('/track/:orderId', authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!order.lalamoveOrderId) {
      return res.status(400).json({ error: 'No delivery assigned yet' });
    }

    const deliveryStatus = await lalamoveService.getOrderDetails(order.lalamoveOrderId);
    const shareLink = (deliveryStatus as any)?.shareLink || (deliveryStatus as any)?.data?.shareLink || order.lalamoveTrackingUrl;
    const status = (deliveryStatus as any)?.status || (deliveryStatus as any)?.data?.status;

    // Refresh stored tracking URL/status if new info is available
    if (shareLink || status) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          lalamoveTrackingUrl: shareLink || order.lalamoveTrackingUrl,
          lalamoveStatus: status || order.lalamoveStatus,
        },
      });
    }

    res.json({
      ...deliveryStatus,
      shareLink: shareLink || null,
      status: status || order.lalamoveStatus || 'OUT_FOR_DELIVERY',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver location
router.get('/driver/:orderId', authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
    });

    if (!order || !order.lalamoveOrderId) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const driverLocation = await lalamoveService.getDriverLocation(order.lalamoveOrderId);
    res.json(driverLocation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
