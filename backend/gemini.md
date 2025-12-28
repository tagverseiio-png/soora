# Soora Backend Documentation

## Project Overview
**Soora** is a backend API for an alcohol delivery platform operating in Singapore. It is built using **Node.js**, **Express**, **TypeScript**, and **Prisma ORM** with **PostgreSQL**. The system handles user authentication, product management, order processing, payments via **Stripe** (supporting PayNow), and delivery logistics via **Lalamove**.

## Architecture
The project follows a standard layered architecture:
1.  **Entry Point (`server.ts`):** Configures the Express app, middleware (CORS, Rate Limit, Compression), and mounts routes.
2.  **Routes (`src/routes/`):** Define API endpoints and handle HTTP requests/responses. They act as controllers.
3.  **Middleware (`src/middleware/`):** Intercepts requests for authentication, validation, and error handling.
4.  **Services (`src/services/`):** Encapsulate complex business logic and external API integrations (Stripe, Lalamove).
5.  **Utilities (`src/utils/`):** Helper functions for database access, caching, and geocoding.
6.  **Database (`prisma/`):** Defines the data schema and handles database migrations/seeding.

## Directory Structure & File Roles

### `prisma/` (Database Layer)
*   **`schema.prisma`**: Defines the data models (User, Product, Order, etc.) and database connection. Key enums include `Role`, `OrderStatus`, and `PaymentMethod`.
*   **`seed.ts`**: Populates the database with initial data: Admin user, Categories (Whisky, Vodka, etc.), Sample Products, and a "WELCOME10" Promotion.

### `src/` (Source Code)

#### Root
*   **`server.ts`**: The main application entry point. Sets up the server, global middleware (rate limiting, body parsing), and routes. Includes health checks and error handling.

#### `middleware/`
*   **`auth.ts`**: Handles JWT authentication (`authenticate`) and Role-Based Access Control (`authorizeRole`).
*   **`errorHandler.ts`**: Global error handling middleware to format responses and log errors.
*   **`validators.ts`**: reusable `express-validator` chains for inputs like registration, login, product creation, and order placement.

#### `routes/` (Controllers)
*   **`auth.ts`**: Handles Registration, Login (with password verification), Logout, and "Me" profile checks. Implements age verification (18+).
*   **`products.ts`**: Public APIs for listing products (filtering by category, brand, price), searching, and fetching details. Includes featured products caching.
*   **`orders.ts`**: Handles Order creation (validates stock), listing user orders, and order cancellation. Calculates totals and delivery fees.
*   **`users.ts`**: User profile management (update info) and Address book management (CRUD for delivery addresses).
*   **`admin.ts`**: Admin-only routes for managing Products (CRUD, stock), Orders (status updates), Users (tier updates), and viewing Analytics (stats, sales reports).
*   **`payments.ts`**: Integration endpoints for Stripe. Creates Payment Intents, Checkout Sessions, and handles Webhooks (success/failure updates).
*   **`delivery.ts`**: Lalamove integration. Generates delivery quotes, creates delivery orders (Admin), tracks status, and gets driver location.

#### `services/` (Business Logic)
*   **`lalamove.service.ts`**: Class-based service wrapping the Lalamove API. Handles HMAC signature generation, quotations, order creation, and webhook/polling for driver status. Specific logic for Singapore market (`SG`).
*   **`stripe.service.ts`**: Class-based service for Stripe. Manages Payment Intents (PayNow/Card), Checkout Sessions, Customers, and Webhook signature verification.

#### `utils/`
*   **`prisma.ts`**: Singleton instance of `PrismaClient` to manage database connections efficiently (especially in dev).
*   **`cache.ts`**: Hybrid caching service. Tries to use **Redis** if configured; falls back to in-memory `Map` otherwise. Used for caching featured products.
*   **`geocode.ts`**: Utility to convert Singapore addresses/postal codes into Lat/Lng coordinates using OpenStreetMap (Nominatim). Crucial for delivery quotes.

## Key Logic & Features

### 1. Authentication & Users
*   **JWT** is used for stateless auth.
*   **Roles**: `CUSTOMER`, `ADMIN`, `DELIVERY`.
*   **Age Verification**: Users must be 18+ to register.
*   **Tiers**: Users have loyalty tiers (Bronze, Silver, Gold, Platinum).

### 2. Product Management
*   Products have stock tracking, categories, and specific alcohol attributes (ABV, Volume, Origin).
*   **Slugs** are auto-generated and unique.
*   **Stock**: Decremented on order creation; restored on cancellation.

### 3. Orders & Delivery
*   **Flow**: User adds items -> Selects Address -> Calculates Delivery Fee (Free > $100 or specific fee) -> Order Created (Pending).
*   **Lalamove**:
    *   Orders are quoted based on pickup (Store) and dropoff (User) coordinates.
    *   If coordinates are missing, `geocode.ts` fetches them from the address string.
    *   Admins manually trigger the "Create Delivery" action to dispatch a Lalamove driver.

### 4. Payments (Stripe)
*   Supports **Credit Cards** and **PayNow** (SG local payment).
*   **Webhook**: Listens for `payment_intent.succeeded` or `checkout.session.completed` to automatically update order status to `CONFIRMED` and payment status to `COMPLETED`.

## Environment Variables
Key variables required:
*   `DATABASE_URL`: PostgreSQL connection string.
*   `JWT_SECRET`: For token signing.
*   `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`: Payments.
*   `LALAMOVE_API_KEY` / `SECRET` / `MARKET`: Delivery.
*   `REDIS_URL`: Optional for caching.
