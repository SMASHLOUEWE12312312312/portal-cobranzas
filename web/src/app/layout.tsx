import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Portal de Cobranzas | Transperuana",
    template: "%s | Portal Cobranzas",
  },
  description: "Sistema integral de gestión de cobranzas y Estados de Cuenta para Transperuana Corredores de Seguros S.A.",
  keywords: ["cobranzas", "EECC", "seguros", "transperuana", "gestión"],
  authors: [{ name: "Transperuana Dev Team" }],
  robots: "noindex, nofollow", // Internal app, not for public indexing
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D32F2F" },
    { media: "(prefers-color-scheme: dark)", color: "#B71C1C" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* CSP Meta Tag - Additional security layer */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://script.google.com https://*.vercel.app;"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Skip Link for Accessibility (WCAG 2.4.1) */}
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>

        {children}
      </body>
    </html>
  );
}
