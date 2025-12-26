# 🍾 Soora Express - Quick Commerce Platform

Premium liquor delivery platform for Singapore with 30-minute quick commerce capabilities.

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 🚀 Automatic Setup (Recommended)

Run the setup script to configure everything automatically:

```bash
./setup.sh
```

This will:
- ✅ Check PostgreSQL connection
- ✅ Create database `sooraexpress`
- ✅ Install all dependencies
- ✅ Set up Prisma schema
- ✅ Seed database with admin user and sample data

### 🎮 Start Application

```bash
./start.sh
```

This opens two terminal windows:
- Backend API server (port 3001)
- Frontend Next.js app (port 3000)

### 👤 Admin Access

**URL:** `http://localhost:3000/admin`

**Credentials:**
- Email: `Soora@admin.com`
- Password: `Admin@soora`

⚠️ **Change password immediately after first login!**

## 📝 Manual Setup

If you prefer manual setup, see [SETUP.md](./SETUP.md) for detailed instructions.

## 🏗️ Project Structure

```
soora/
├── app/                    # Next.js 14 App Router
│   ├── admin/              # Admin dashboard
│   ├── shop/               # Product catalog
│   ├── checkout/           # Checkout flow
│   └── order-success/      # Order confirmation
├── backend/                # Express + Prisma API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── controllers/    # Business logic
│   │   ├── services/       # External services
│   │   └── middleware/     # Auth, validation
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Database seeding
├── components/             # React components
├── lib/                    # Utilities & API client
└── public/                 # Static assets
```

## 🔧 Configuration

### Database
- **Name:** `sooraexpress`
- **User:** `postgres`
- **Password:** `Sooraadmin`
- **Port:** `5432`

### Payment Processing
- **Stripe:** Demo keys configured (replace with live keys for production)
- **Test Card:** `4242 4242 4242 4242`

### Delivery
- **Lalamove:** Demo keys configured (replace with live keys for production)
- **Region:** Singapore (SG)

## 🛠️ Development Commands

### Backend
```bash
cd backend

# Start dev server with hot reload
npm run dev

# View database in Prisma Studio
npm run prisma:studio

# Reset database
npm run db:reset

# Generate Prisma Client
npm run prisma:generate
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📦 Features

### Customer Features
- ✅ Browse liquor catalog by category
- ✅ Product search and filtering
- ✅ Shopping cart with real-time updates
- ✅ Secure checkout with Stripe
- ✅ Age verification (18+)
- ✅ Order tracking
- ✅ User accounts and profiles
- ✅ Multiple delivery addresses
- ✅ Promotional codes

### Admin Features
- ✅ Product management (CRUD)
- ✅ Order management
- ✅ Customer management
- ✅ Inventory tracking
- ✅ Sales analytics
- ✅ Promotion management
- ✅ Delivery tracking via Lalamove

## 🎯 Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, TailwindCSS, shadcn/ui
- **State:** React Context API
- **Forms:** React Hook Form
- **Payment:** Stripe Elements

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 14
- **ORM:** Prisma
- **Auth:** JWT + bcrypt
- **Validation:** express-validator

### Infrastructure
- **Deployment:** Vercel (Frontend) + Railway/Render (Backend)
- **Storage:** PostgreSQL
- **Cache:** Redis (optional)
- **Email:** NodeMailer
- **Delivery:** Lalamove API

## 📊 Database Schema

Main entities:
- **Users** - Customer & admin accounts
- **Products** - Liquor inventory
- **Categories** - Product organization
- **Orders** - Purchase records
- **Addresses** - Delivery locations
- **Payments** - Transaction records
- **Reviews** - Product ratings
- **Promotions** - Discount codes

See [schema.prisma](./backend/prisma/schema.prisma) for full schema.

## 🔒 Security

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on API endpoints
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ Age verification for alcohol
- ✅ Secure payment processing via Stripe

## 🚀 Deployment

### Environment Variables to Update

**Backend (.env):**
- `NODE_ENV=production`
- `DATABASE_URL` - Production database
- `JWT_SECRET` - Strong random secret
- `STRIPE_SECRET_KEY` - Live Stripe key
- `LALAMOVE_API_KEY` - Production Lalamove key
- `FRONTEND_URL` - Production frontend URL

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL` - Production API URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Live Stripe publishable key

### Deployment Platforms

**Recommended:**
- Frontend: Vercel
- Backend: Railway, Render, or DigitalOcean
- Database: Supabase, Railway, or managed PostgreSQL

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update status (admin)

### Payments
- `POST /api/payments/create-intent` - Create payment
- `POST /api/payments/webhook` - Stripe webhook

## 🧪 Testing

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test admin login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Soora@admin.com","password":"Admin@soora"}'
```

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready -U postgres

# Restart PostgreSQL
brew services restart postgresql@14
```

### Port Already in Use
```bash
# Find and kill process on port 3001
lsof -i :3001
kill -9 <PID>
```

### Prisma Client Not Generated
```bash
cd backend
npm run prisma:generate
```

## 📄 License

Private - All Rights Reserved

## 🤝 Support

For issues or questions:
1. Check [SETUP.md](./SETUP.md) for detailed setup
2. Review backend/frontend console logs
3. Use Prisma Studio to inspect database state
4. Check browser developer console for errors

---

**Built with ❤️ for Singapore's premium liquor delivery**
