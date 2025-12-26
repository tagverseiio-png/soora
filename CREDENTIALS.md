# 🔑 Soora Express - Quick Reference

## 📋 System Credentials

### Database
```
Database Name: sooraexpress
Username:      postgres
Password:      Sooraadmin
Host:          localhost
Port:          5432
```

**Connection String:**
```
postgresql://postgres:Sooraadmin@localhost:5432/sooraexpress
```

### Admin Panel
```
Email:    Soora@admin.com
Password: Admin@soora
```

### Stripe (Demo/Test Mode)
```
Secret Key:      sk_test_51QdJvx2KRaFI8T6MdAbCdEfGhIjKlMnOpQrStUvWxYz
Publishable Key: pk_test_51QdJvx2KRaFI8T6MAbCdEfGhIjKlMnOpQrStUvWxYz
Webhook Secret:  whsec_demo_webhook_secret_key
```

**Test Card Numbers:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Any future expiry, any CVC
```

### Lalamove (Demo/Sandbox Mode)
```
API Key:    demo_lalamove_api_key
API Secret: demo_lalamove_api_secret
Region:     SG (Singapore)
API URL:    https://rest.sandbox.lalamove.com
```

## 🌐 Application URLs

### Development
```
Frontend:       http://localhost:3000
Backend API:    http://localhost:3001
Admin Panel:    http://localhost:3000/admin
Login Page:     http://localhost:3000/login
Shop:           http://localhost:3000/shop
Checkout:       http://localhost:3000/checkout
Prisma Studio:  http://localhost:5555 (run: npm run prisma:studio)
```

## 🚀 Quick Commands

### Initial Setup
```bash
./setup.sh
```

### Start Application
```bash
./start.sh
```

### Manual Start
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

### Database Commands
```bash
cd backend

# View database
npm run prisma:studio

# Reset database (deletes all data)
npm run db:reset

# Seed database again
npm run seed

# Run migrations
npm run prisma:migrate
```

### Development Commands
```bash
# Frontend
npm run dev        # Start dev server
npm run build      # Build for production
npm run start      # Start production server

# Backend (from backend/)
npm run dev        # Start dev server
npm run build      # Compile TypeScript
npm run start      # Start production server
```

## 📦 Sample Data

After seeding, you'll have:
- **Admin User:** Soora@admin.com
- **Categories:** 11 liquor categories (Whisky, Vodka, Gin, Rum, etc.)
- **Products:** 3 sample products
- **Promotion:** WELCOME10 (10% off, min $50 order)

## 🧪 Test Scenarios

### 1. Admin Login
```
1. Go to http://localhost:3000/login
2. Email: Soora@admin.com
3. Password: Admin@soora
4. Should redirect to admin dashboard
```

### 2. Test Checkout
```
1. Browse shop: http://localhost:3000/shop
2. Add products to cart
3. Go to checkout
4. Use test card: 4242 4242 4242 4242
5. Complete order
```

### 3. API Health Check
```bash
curl http://localhost:3001/api/health
```

## ⚠️ Important Notes

1. **Change Admin Password:** After first login, change the default password immediately
2. **Demo Keys:** Stripe and Lalamove are using demo/test keys - replace with real keys before production
3. **Database Backup:** Always backup database before running reset commands
4. **Environment:** Currently set to 'production' mode - change if needed
5. **Security:** Update JWT_SECRET before deploying to production

## 🔧 Configuration Files

```
Backend:  backend/.env
Frontend: .env.local
Database: backend/prisma/schema.prisma
```

## 📞 Emergency Procedures

### If Backend Won't Start
```bash
cd backend
rm -rf node_modules
npm install
npm run prisma:generate
npm run dev
```

### If Database Connection Fails
```bash
# Check PostgreSQL
pg_isready -U postgres

# Restart PostgreSQL
brew services restart postgresql@14

# Recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS sooraexpress;"
psql -U postgres -c "CREATE DATABASE sooraexpress;"
cd backend && npm run db:setup
```

### If Frontend Won't Start
```bash
rm -rf node_modules .next
npm install
npm run dev
```

## 📊 Default Settings

```
Min Order Amount:        $50 SGD
Delivery Fee:            $5 SGD
Free Delivery Threshold: $100 SGD
Default Delivery Time:   30 minutes
Min Age:                 18 years
Currency:                SGD (Singapore Dollar)
```

## 🎯 First-Time Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] Database 'sooraexpress' created
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Environment files configured
- [ ] Database schema pushed
- [ ] Database seeded with initial data
- [ ] Admin login tested
- [ ] Sample product visible in shop
- [ ] Test checkout works

## 📝 Production Deployment Checklist

- [ ] Change admin password
- [ ] Update JWT_SECRET
- [ ] Replace Stripe test keys with live keys
- [ ] Replace Lalamove demo keys with production keys
- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set up SSL/HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up email service
- [ ] Enable Redis caching
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

---

**Keep this file secure - it contains sensitive credentials!**
