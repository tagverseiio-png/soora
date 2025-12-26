# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### Security Updates Required

1. **Change Admin Password**
   - Login to admin panel
   - Navigate to settings/profile
   - Update password from `Admin@soora` to a strong password

2. **Update JWT Secret**
   ```bash
   # Generate a strong secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Update in backend/.env
   JWT_SECRET=<your-generated-secret>
   ```

3. **Replace Payment Keys**
   - Get live Stripe keys from https://dashboard.stripe.com
   - Update `STRIPE_SECRET_KEY` in backend/.env
   - Update `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in .env.local

4. **Replace Delivery Keys**
   - Get production Lalamove keys
   - Update `LALAMOVE_API_KEY` and `LALAMOVE_API_SECRET`
   - Change `LALAMOVE_BASE_URL` to production endpoint

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend on Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Set Environment Variables:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
     ```
   - Deploy!

#### Backend on Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Connect GitHub repository

2. **Add PostgreSQL Database**
   - Create new PostgreSQL service
   - Note the DATABASE_URL

3. **Deploy Backend**
   - Create new service from GitHub repo
   - Set root directory to `/backend`
   - Add Environment Variables:
     ```
     NODE_ENV=production
     DATABASE_URL=<from-railway-postgres>
     JWT_SECRET=<your-secret>
     STRIPE_SECRET_KEY=sk_live_...
     LALAMOVE_API_KEY=<production-key>
     LALAMOVE_API_SECRET=<production-secret>
     FRONTEND_URL=https://your-app.vercel.app
     ```
   - Deploy!

4. **Run Database Migrations**
   ```bash
   railway run npm run prisma:migrate:deploy
   railway run npm run seed
   ```

### Option 2: Full Stack on Render

1. **Create PostgreSQL Database**
   - New PostgreSQL instance on Render
   - Note connection details

2. **Deploy Backend**
   - New Web Service
   - Connect repository
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Add environment variables

3. **Deploy Frontend**
   - New Static Site
   - Build Command: `npm run build`
   - Publish Directory: `.next`
   - Add environment variables

### Option 3: DigitalOcean Droplet

1. **Create Droplet**
   ```bash
   # Ubuntu 22.04 LTS
   # Minimum: 2GB RAM, 1 vCPU
   ```

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Install PM2
   sudo npm install -g pm2
   ```

3. **Setup Database**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE sooraexpress;
   CREATE USER soora WITH ENCRYPTED PASSWORD 'your-strong-password';
   GRANT ALL PRIVILEGES ON DATABASE sooraexpress TO soora;
   \q
   ```

4. **Clone and Setup Application**
   ```bash
   cd /var/www
   git clone <your-repo>
   cd soora
   
   # Backend
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run seed
   npm run build
   
   # Frontend
   cd ..
   npm install
   npm run build
   ```

5. **Setup PM2**
   ```bash
   # Backend
   cd /var/www/soora/backend
   pm2 start dist/server.js --name soora-backend
   
   # Frontend
   cd /var/www/soora
   pm2 start npm --name soora-frontend -- start
   
   # Save PM2 config
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/soora
   
   # Frontend
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   
   # Backend API
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Enable SSL with Let's Encrypt**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check backend health
curl https://api.yourdomain.com/api/health

# Check frontend
curl https://yourdomain.com

# Test admin login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Soora@admin.com","password":"your-new-password"}'
```

### 2. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://api.yourdomain.com/api/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in backend environment

### 3. Setup Monitoring

**Backend Logging:**
```javascript
// Add to backend/src/server.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

**Error Tracking:**
- Sentry: https://sentry.io
- LogRocket: https://logrocket.com
- Rollbar: https://rollbar.com

**Uptime Monitoring:**
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://pingdom.com

### 4. Setup Backups

**Database Backups (PostgreSQL):**
```bash
# Automated daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/sooraexpress_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR
pg_dump -U soora sooraexpress > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

**Automated Backup (Railway):**
- Enable automatic backups in Railway dashboard
- Configure backup retention period

### 5. Performance Optimization

**Enable Redis Caching:**
```bash
# Install Redis
sudo apt install redis-server

# Update backend/.env
REDIS_URL=redis://localhost:6379
```

**Enable Compression:**
- Already configured in server.ts (gzip compression)

**CDN for Static Assets:**
- Use Vercel's built-in CDN
- Or configure CloudFlare

**Database Optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### 6. Security Hardening

**Firewall Configuration:**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**Rate Limiting:**
- Already configured in server.ts
- Adjust limits based on traffic

**Security Headers:**
```javascript
// Add to backend/src/server.ts
import helmet from 'helmet';
app.use(helmet());
```

**Environment Security:**
```bash
# Restrict .env file permissions
chmod 600 backend/.env
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check uptime status
- Review failed payments

**Weekly:**
- Review database performance
- Check disk space
- Update dependencies (if security patches)

**Monthly:**
- Full database backup verification
- Security audit
- Performance review
- Update all dependencies

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 restart soora-backend

# Frontend
cd ..
npm install
npm run build
pm2 restart soora-frontend
```

### Rollback Procedure

```bash
# Identify last working commit
git log

# Rollback to commit
git checkout <commit-hash>

# Rebuild and restart
npm install
npm run build
pm2 restart all
```

## Troubleshooting

### Backend Not Responding
```bash
pm2 logs soora-backend
pm2 restart soora-backend
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### High Memory Usage
```bash
# Check processes
pm2 monit

# Increase memory limit
pm2 delete all
pm2 start ecosystem.config.js --max-memory-restart 500M
```

## Scaling Strategy

### Horizontal Scaling
- Load balancer (Nginx/CloudFlare)
- Multiple backend instances
- Database read replicas

### Vertical Scaling
- Upgrade server resources
- Optimize database queries
- Implement caching layer

### Database Scaling
- Connection pooling (PgBouncer)
- Read replicas
- Consider managed database (Supabase, PlanetScale)

---

**Deployment Completed! 🎉**

Monitor your application and adjust configurations as needed based on real-world usage patterns.
