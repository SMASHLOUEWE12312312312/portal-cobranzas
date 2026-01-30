import type { NextConfig } from "next";

// CSP optimizada para Power BI embed
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Scripts: self + Power BI + Microsoft CDNs
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.powerbi.com https://*.powerbi.com https://*.msecnd.net https://vercel.live",
  // Estilos
  "style-src 'self' 'unsafe-inline' https://app.powerbi.com https://*.powerbi.com",
  // Imágenes
  "img-src 'self' data: blob: https: http:",
  // Fuentes
  "font-src 'self' data: https://*.powerbi.com https://*.msecnd.net",
  // Conexiones XHR/fetch
  "connect-src 'self' https://script.google.com https://app.powerbi.com https://*.powerbi.com https://*.analysis.windows.net https://*.microsoftonline.com wss://*.powerbi.com https://vercel.live",
  // Iframes (CRÍTICO para Power BI embed)
  "frame-src 'self' https://app.powerbi.com https://*.powerbi.com",
  // Child frames (legacy support)
  "child-src 'self' https://app.powerbi.com https://*.powerbi.com blob:",
  // Workers
  "worker-src 'self' blob:",
  // Quién puede embeber esta página
  "frame-ancestors 'self'",
  // Forms
  "form-action 'self'",
  // Base URI
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes except API
        source: "/((?!api).*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
        ],
      },
      {
        // API routes - más restrictivo
        source: "/api/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
