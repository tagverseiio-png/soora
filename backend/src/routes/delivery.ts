import { Router } from 'express';
import { lalamoveService } from '../services/lalamove.service';
import { authenticate, authorizeRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';

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

    if (!address.latitude || !address.longitude) {
      return res.status(400).json({ 
        error: 'Address coordinates not available. Please update address.' 
      });
    }

    // Store/warehouse location (you should set this in env or database)
    const storeLocation = {
      lat: 1.3521, // Example: Singapore Central
      lng: 103.8198,
      address: 'Soora Warehouse, Singapore',
    };

    const quotation = await lalamoveService.getDeliveryEstimate(
      storeLocation.lat,
      storeLocation.lng,
      address.latitude,
      address.longitude,
      storeLocation.address,
      `${address.street}, Singapore ${address.postalCode}`
    );

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
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

    if (!order.address.latitude || !order.address.longitude) {
      return res.status(400).json({ 
        error: 'Address coordinates not available' 
      });
    }

    // Store location
    const storeLocation = {
      lat: '1.3521',
      lng: '103.8198',
      address: 'Soora Warehouse, Singapore',
    };

    // Get quotation first
    const quotation = await lalamoveService.getDeliveryEstimate(
      parseFloat(storeLocation.lat),
      parseFloat(storeLocation.lng),
      order.address.latitude,
      order.address.longitude,
      storeLocation.address,
      `${order.address.street}, Singapore ${order.address.postalCode}`
    );

    // Create delivery order
    const deliveryOrder = await lalamoveService.createOrder({
      serviceType: 'MOTORCYCLE',
      stops: [
        {
          location: {
            lat: storeLocation.lat,
            lng: storeLocation.lng,
            address: storeLocation.address,
          },
          name: 'Soora Store',
          phone: process.env.STORE_PHONE || '+6512345678',
        },
        {
          location: {
            lat: order.address.latitude.toString(),
            lng: order.address.longitude.toString(),
            address: `${order.address.street}, Singapore ${order.address.postalCode}`,
          },
          name: order.customerName,
          phone: order.customerPhone,
          remarks: order.deliveryNotes || '',
        },
      ],
      quotedTotalFee: quotation.quotedTotalFee,
      sender: {
        name: 'Soora Store',
        phone: process.env.STORE_PHONE || '+6512345678',
      },
      recipients: [
        {
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
