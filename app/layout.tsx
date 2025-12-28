import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sooraaexpress.com'),

  title: {
    default: "Soora Express — Singapore’s Premier Spirits Boutique",
    template: "%s | Soora Express",
  },

  description:
    "Soora Express is Singapore’s premium spirits boutique delivering curated fine wines, rare whiskies, champagnes, and artisanal spirits in 60 minutes across Singapore.",

  applicationName: "Soora Express",

  keywords: [
    "Soora Express",
    "Singapore alcohol delivery",
    "premium spirits Singapore",
    "whisky delivery Singapore",
    "wine delivery Singapore",
    "champagne Singapore",
    "artisanal spirits",
    "same day alcohol delivery",
    "luxury liquor Singapore",
  ],

  authors: [{ name: "Soora Express" }],
  creator: "Soora Express",
  publisher: "Soora Express",

  alternates: {
    canonical: '/',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favion.ico", type: "image/x-icon" },
    ],
    shortcut: "/favion.ico",
    apple: "/favion.ico",
  },

  openGraph: {
    type: "website",
    locale: "en_SG",
    url: "https://www.sooraaexpress.com",
    siteName: "Soora Express",
    title: "Soora Express — Singapore’s Premier Spirits Boutique",
    description:
      "Curated fine wines, rare whiskies, champagnes, and artisanal spirits delivered in 60 minutes across Singapore.",
    images: [
      {
        url: "/favion.ico",
        width: 512,
        height: 512,
        alt: "Soora Express Logo",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@sooraaexpress",
    creator: "@sooraaexpress",
    title: "Soora Express — Singapore’s Premier Spirits Boutique",
    description:
      "Premium spirits delivered in 60 minutes across Singapore.",
    images: ["/favion.ico"],
  },

  category: "ecommerce",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={inter.className}
      suppressHydrationWarning
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
