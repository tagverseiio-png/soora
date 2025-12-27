# Soora Project Context

This file provides a comprehensive overview of the Soora project (Frontend & Root Context) for use with LLMs.

## 1. Project Overview

**Soora** is a premium liquor delivery platform for Singapore with 30-minute quick commerce capabilities.
It consists of a **Next.js (App Router)** frontend and a **Node.js/Express** backend.

**Tech Stack:**
-   **Frontend:** Next.js 14, React 18, TailwindCSS, shadcn/ui.
-   **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL.
-   **Integrations:** Stripe (Payments), Lalamove (Delivery).

## 2. File Structure

```text
D:\soora\
├── app/                    # Next.js App Router
│   ├── admin/              # Admin Dashboard pages
│   ├── checkout/           # Checkout flow
│   ├── login/              # Auth pages
│   ├── shop/               # Main browsing page
│   ├── layout.tsx          # Root layout with AuthProvider
│   └── page.tsx            # Landing page (redirects to /shop if auth)
├── backend/                # Backend API (See backend/gemini.md)
├── components/             # React Components (Shadcn + Custom)
│   ├── ui/                 # Reusable UI components (buttons, inputs, etc.)
│   ├── ProductCard.tsx     # Product display component
│   └── ...
├── lib/                    # Core Utilities & State
│   ├── api.ts              # API service wrappers (typed)
│   ├── apiClient.ts        # Axios/Fetch client with interceptors
│   ├── AuthContext.tsx     # Global Auth State (Context API)
│   ├── data.ts             # Static data/mocks
│   ├── types.ts            # Shared TypeScript interfaces
│   └── utils.ts            # Helper functions (clsx, etc.)
├── public/                 # Static Assets
├── scripts/                # Utility scripts
├── package.json            # Dependencies & Scripts
├── next.config.js          # Next.js Config
├── tailwind.config.ts      # Tailwind Theme Config
└── tsconfig.json           # TypeScript Config
```

## 3. Key Configuration Files

### `package.json`
```json
{
  "name": "nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.1",
    "lucide-react": "^0.446.0",
    "next": "13.5.1",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-hook-form": "^7.53.0",
    "sonner": "^1.5.0",
    "tailwindcss": "3.3.3",
    "zod": "^3.23.8"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "backend/**"]
}
```

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
```

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content": [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... (standard shadcn colors)
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
```

## 4. Core Logic & Types

### `lib/types.ts`
```typescript
export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  isActive: boolean;
  category: string;
  slug: string;
  images: string[];
  // ...
};

export type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  // ...
};

export type User = {
  id: string;
  email: string;
  role: string;
  tier: string;
  // ...
};
```

### `lib/api.ts` (API Service Layer)
```typescript
import { apiClient } from './apiClient';
import { Product, Order } from './types';

export const authApi = {
  async login(email: string, password: string) { ... },
  async register(email: string, password: string, data?: any) { ... },
  async getCurrentUser() { ... },
};

export const productsApi = {
  async getAll(params?: any) { ... },
  async getById(id: string) { ... },
};

export const ordersApi = {
  async create(payload: any) { ... },
  async getMyOrders() { ... },
};

// ... exports for usersApi, paymentsApi, deliveryApi, adminApi
```

### `lib/AuthContext.tsx`
```typescript
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, type User } from './api';

// ... AuthContext definition

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Handles session check on mount
  // Provides signIn, signUp, signOut methods
  // Manages loading state
  
  return (
    <AuthContext.Provider value={{ user, signIn, signOut, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## 5. Main Application Structure

### `app/layout.tsx`
Wraps the entire application with `AuthProvider` and global styles.

```typescript
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### `app/page.tsx` (Root Route)
Handles redirection logic. If authenticated -> `/shop`, else -> Landing Page.

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) router.push('/shop');
    }, [user, router]);

    return <LandingPage onEnter={() => router.push('/shop')} />;
}
```

## 6. Backend Reference

For detailed backend documentation (Routes, Schema, Services), please refer to:
**`backend/gemini.md`**

```