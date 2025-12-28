import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import userRoutes from './routes/users';
import paymentRoutes from './routes/payments';
import deliveryRoutes from './routes/delivery';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Skip rate limits for local/dev to avoid blocking during development
const isLocalRequest = (req: Request): boolean => {
  const localHosts = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  const ip = req.ip || '';
  const host = req.hostname || '';

  return (
    !isProduction ||
    localHosts.includes(ip) ||
    localHosts.includes(host) ||
    (!!origin && origin.includes('localhost'))
  );
};

const shouldApplyRateLimit = isProduction && process.env.ENABLE_RATE_LIMIT !== 'false';
const buildLimiter = (max: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => !shouldApplyRateLimit || isLocalRequest(req),
});

// Needed for correct IP detection when behind a proxy (e.g., Vercel/Netlify)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.sooraaexpress.com'
    ];
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
// Gzip compression to reduce payload size
app.use(compression());
// Rate limiting to protect API
const apiLimiter = buildLimiter(100);
const authLimiter = buildLimiter(50);
app.use('/api', apiLimiter);
// Increase body size limit to 10MB for product images, but avoid JSON parsing for Stripe webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    return next();
  }
  return express.json({ limit: '10mb' })(req, res, () => {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'Soora API is running',
    timestamp: new Date().toISOString(),
    region: 'Singapore'
  });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/delivery', deliveryRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Soora API Server running on port ${PORT}`);
  console.log(`📍 Region: Singapore`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
