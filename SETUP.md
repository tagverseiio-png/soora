# 🚀 Soora Express - Quick Commerce Setup Guide

## 📋 Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## 🗄️ Database Configuration

### Database Details
- **Database Name:** `sooraexpress`
- **Username:** `postgres`
- **Password:** `Sooraadmin`
- **Port:** `5432` (default PostgreSQL port)

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE sooraexpress;

# Exit PostgreSQL
\q
```

## 🔧 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

The `.env` file is already configured with:
- Database connection: `postgresql://postgres:Sooraadmin@localhost:5432/sooraexpress`
- Admin credentials: `Soora@admin.com` / `Admin@soora`
- Demo Stripe keys (replace later)
- Demo Lalamove keys (replace later)

### 4. Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Seed database with admin user and sample data
npm run seed
```

Or use the all-in-one command:

```bash
npm run db:setup
```

### 5. Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

Backend will run on: `http://localhost:3001`

## 🎨 Frontend Setup

### 1. Navigate to Root Directory

```bash
cd ..
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

The `.env.local` file is already configured with:
- API URL: `http://localhost:3001/api`
- Stripe publishable key (demo)
- Application settings

### 4. Start Frontend

```bash
# Development mode
npm run dev

# Build for production
npm run build
npm start
```

Frontend will run on: `http://localhost:3000`

## 👤 Admin Panel Access

### Login Credentials
- **Email:** `Soora@admin.com`
- **Password:** `Admin@soora`

### Access Points
- Frontend Admin: `http://localhost:3000/admin`
- Backend API: `http://localhost:3001/api`

### First Login Steps
1. Go to `http://localhost:3000/login`
2. Enter admin credentials
3. You'll be redirected to admin dashboard
4. **IMPORTANT:** Change your password immediately for security

## 💳 Payment Integration

### Stripe Configuration
Currently using **demo/test keys**:
- Test mode is enabled
- Use Stripe test card numbers for testing
- Replace with live keys when ready for production

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date, any 3-digit CVC

### Lalamove Configuration
Currently using **demo/sandbox keys**:
- Sandbox environment enabled
- Replace with production keys when ready

## 🔄 Database Management Commands

```bash
# View database in Prisma Studio
npm run prisma:studio

# Reset database (WARNING: Deletes all data)
npm run db:reset

# Create new migration
npm run prisma:migrate

# Deploy migrations (production)
npm run prisma:migrate:deploy
```

## 📦 Sample Data

The seed script creates:
- ✅ Admin user (Soora@admin.com)
- ✅ 11 product categories
- ✅ 3 sample products
- ✅ Welcome promotion (WELCOME10 - 10% off)

## 🧪 Testing the Application

### 1. Test Backend API
```bash
# Check health
curl http://localhost:3001/api/health

# Test admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Soora@admin.com","password":"Admin@soora"}'
```

### 2. Test Frontend
1. Visit `http://localhost:3000`
2. Browse products
3. Add items to cart
4. Test checkout with Stripe test card
5. Login as admin and access dashboard

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -U postgres

# Verify database exists
psql -U postgres -l | grep sooraexpress

# Test connection
psql -U postgres -d sooraexpress
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Prisma Issues
```bash
# Regenerate Prisma Client
npx prisma generate

# Reset and resync
npx prisma migrate reset
```

## 🔐 Security Checklist

Before going to production:

- [ ] Change admin password
- [ ] Replace JWT_SECRET with strong random string
- [ ] Replace Stripe test keys with live keys
- [ ] Replace Lalamove demo keys with production keys
- [ ] Set NODE_ENV to 'production'
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Configure email service
- [ ] Set up Redis for caching
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Product Endpoints
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Order Endpoints
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status (admin)

### Payment Endpoints
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/webhook` - Stripe webhook handler

## 🎯 Next Steps

1. **Add Products:** Use admin panel to add your actual product inventory
2. **Configure Shipping:** Set up delivery zones and pricing
3. **Test Orders:** Place test orders end-to-end
4. **Customize Design:** Update branding, colors, and images
5. **Deploy:** Deploy to production (Vercel, Netlify, or your server)

## 📞 Support

For issues or questions:
- Check logs in backend console
- Review Prisma Studio for database state
- Check browser console for frontend errors

## 🎉 You're All Set!

Your Soora Express application is now fully configured and ready to use!

**Quick Start Commands:**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
npm run dev
```

Visit `http://localhost:3000` and login with `Soora@admin.com` / `Admin@soora`
