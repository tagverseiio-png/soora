# Soora Technical Summary Report

## 1. Executive Summary

This report provides a technical overview of the **Soora Liquor Quick Commerce** application. The project is a full-stack web application designed for the quick commerce delivery of alcohol in Singapore. It utilizes a monorepo-style structure containing a Next.js frontend and an Express.js/TypeScript backend.

## 2. Project Architecture

The project is organized into two main distinct directories within a single repository:

*   **Frontend (`/` root & `app/`):** A Next.js 13 application responsible for the user interface and client-side logic.
*   **Backend (`backend/`):** A Node.js/Express application acting as the REST API server, handling business logic, database interactions, and authentication.

### Directory Structure Overview
```text
/
├── app/                # Next.js App Router pages and layouts
├── components/         # Reusable React components (UI & Feature-specific)
├── lib/                # Shared utilities, API clients, and contexts
├── public/             # Static assets (images, icons)
├── backend/            # Backend server root
│   ├── src/
│   │   ├── routes/     # API route definitions and controller logic
│   │   ├── middleware/ # Express middleware (Auth, Error handling)
│   │   ├── services/   # External services (Stripe, Lalamove - inferred)
│   │   ├── utils/      # Utility functions (Prisma, Cache, etc.)
│   │   └── server.ts   # Server entry point
│   └── prisma/         # Database schema and seed scripts
└── ...config files     # (next.config.js, tailwind.config.ts, etc.)
```

## 3. Frontend Specifications

### Core Technologies
*   **Framework:** Next.js 13.5.1 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, configured with `tailwindcss-animate` and `class-variance-authority` for component styling.
*   **UI Library:** Radix UI primitives (Accordion, Dialog, Popover, etc.) used as the foundation for custom UI components.
*   **Icons:** Lucide React.

### State Management & Data Fetching
*   **Authentication State:** Managed via `AuthContext` (`lib/AuthContext.tsx`), which persists user sessions using local storage (`auth_token`) and synchronizes with the backend.
*   **API Communication:** A custom `apiClient` (`lib/apiClient.ts`) wraps the native `fetch` API. It handles:
    *   Base URL configuration.
    *   Automatic injection of Authorization headers (Bearer token).
    *   Timeout management (default 10s).
    *   Centralized error handling.
*   **Service Layer:** API calls are abstracted into service objects (e.g., `authApi`, `productsApi`, `ordersApi`) in `lib/api.ts`.

### Key Components
*   **LandingPage:** A visually rich entry point featuring scroll-triggered animations and high-quality imagery, redirecting authenticated users to the shop.
*   **UI Components:** A comprehensive set of shadcn/ui-like components located in `components/ui/`.

## 4. Backend Specifications

### Core Technologies
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Prisma Client
*   **Caching:** Redis (implied by `ioredis` dependency and `cache.ts` usage).

### API Design
*   **Style:** RESTful API.
*   **Routing:** Routes are modularized in `backend/src/routes/`.
*   **Controller Logic:** Logic is primarily implemented inline within route handlers (based on `products.ts` inspection) rather than separate controller files.
*   **Security:**
    *   **Rate Limiting:** Implemented using `express-rate-limit`, with special handling for local development.
    *   **CORS:** Configured to allow specific origins (frontend, localhost).
    *   **Compression:** Gzip compression enabled via `compression` middleware.
    *   **Authentication:** JWT-based protection for sensitive routes.

### Key Modules
*   **Products:** Supports complex filtering (category, brand, price range), search, and pagination. Handles admin CRUD operations.
*   **Orders:** Manages order lifecycle, integration with payment intents (Stripe), and delivery tracking.
*   **Admin:** Provides endpoints for inventory management, order oversight, and sales analytics.

## 5. Database Schema (Prisma)

The application uses a relational database model defined in `backend/prisma/schema.prisma`.

### Key Models
*   **User:** Stores customer data, roles (CUSTOMER, ADMIN, DELIVERY), and tiers (Bronze, Silver, etc.).
*   **Product:** Detailed product info including inventory, pricing, alcohol-specific attributes (ABV, volume), and SEO metadata.
*   **Order & OrderItem:** Captures transaction details, snapshots of product data at purchase time, and delivery status.
*   **Address:** User delivery addresses with specific fields for Singapore districts.
*   **Review:** User-generated product ratings and comments.
*   **Category:** Product organization hierarchy.

## 6. Infrastructure & Configuration

*   **Environment Variables:** Heavy reliance on `.env` for secrets (Database URL, API Keys).
*   **Next.js Config:** configured with `unoptimized: true` for images, suggesting flexibility in hosting (e.g., Netlify, static export).
*   **Build Scripts:** Separate build processes for frontend (`next build`) and backend (`tsc`).

## 7. Observations & Recommendations

*   **Controller Logic:** Moving inline route logic to dedicated controllers in `backend/src/controllers/` would improve testability and readability as the application grows.
*   **Error Handling:** The frontend uses a centralized `handleApiError` function, which ensures consistent user feedback.
*   **Performance:** The backend implements caching for frequently accessed data (e.g., featured products), which is a best practice for e-commerce.
