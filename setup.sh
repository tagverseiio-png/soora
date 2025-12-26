#!/bin/bash

# Soora Express - Complete Setup Script
# This script sets up the entire application from scratch

set -e  # Exit on error

echo "🚀 Starting Soora Express Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "${BLUE}Checking PostgreSQL...${NC}"
if ! pg_isready -U postgres &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL first.${NC}"
    echo "   Run: brew services start postgresql@14"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Check if database exists, create if not
echo -e "${BLUE}Checking database 'sooraexpress'...${NC}"
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw sooraexpress; then
    echo -e "${GREEN}✅ Database 'sooraexpress' already exists${NC}"
else
    echo -e "${YELLOW}Creating database 'sooraexpress'...${NC}"
    psql -U postgres -c "CREATE DATABASE sooraexpress;" &> /dev/null
    echo -e "${GREEN}✅ Database created${NC}"
fi
echo ""

# Backend Setup
echo -e "${BLUE}Setting up Backend...${NC}"
cd backend

echo "  📦 Installing backend dependencies..."
npm install --silent

echo "  🔧 Generating Prisma Client..."
npm run prisma:generate --silent

echo "  🗄️  Pushing database schema..."
npm run prisma:push --silent

echo "  🌱 Seeding database..."
npm run seed

cd ..
echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# Frontend Setup
echo -e "${BLUE}Setting up Frontend...${NC}"
echo "  📦 Installing frontend dependencies..."
npm install --silent

echo -e "${GREEN}✅ Frontend setup complete${NC}"
echo ""

# Summary
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Setup Complete! ✨${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📝 Admin Credentials:${NC}"
echo "   Email:    Soora@admin.com"
echo "   Password: Admin@soora"
echo ""
echo -e "${BLUE}🚀 To start the application:${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Backend:${NC}"
echo "   cd backend && npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 - Frontend:${NC}"
echo "   npm run dev"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Admin:     http://localhost:3000/admin"
echo ""
echo -e "${YELLOW}⚠️  Remember to change admin password after first login!${NC}"
echo ""
