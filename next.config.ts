import type { NextConfig } from 'next';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa');

// Bundle analyzer (only in production builds with NEXT_PUBLIC_ANALYZE=true)

const bundleAnalyzer = process.env['NEXT_PUBLIC_ANALYZE']
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@next/bundle-analyzer')({
      analysisMode: 'static',
      reportFilename: 'bundle-analysis.html',
      openAnalyzer: false,
    })
  : undefined;

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
  ],
};

const nextConfig: NextConfig = withPWA(pwaConfig)({
  output: 'standalone',
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    // Environment-aware CORS origin for security
    const corsOrigin = process.env['NEXT_PUBLIC_APP_URL'] || '';

    return [
      {
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Content Security Policy - production ready
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Script sources - use strict CSP, avoid unsafe-eval
              "script-src 'self' 'unsafe-inline'",
              // Allow CDN for third-party libraries (documented sources)
              "script-src-elem 'self' https://cdn.jsdelivr.net https://unpkg.com",
              // Style sources
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Font sources
              "font-src 'self' https://fonts.gstatic.com data:",
              // Image sources
              "img-src 'self' data: blob: https:*.googleapis.com https://*.gstatic.com",
              // Connect sources (fetch, XMLHttpRequest)
              "connect-src 'self' https: wss: ws: https://*.googleapis.com",
              // Frame/ancestors
              "frame-ancestors 'none'",
              // Form actions
              "base-uri 'self'",
              "form-action 'self'",
              // Object/embed
              "object-src 'none'",
              // Worker sources
              "worker-src 'self' blob:",
              // Child sources
              "child-src 'self' blob:",
              // Media sources
              "media-src 'self'",
              // Manifest
              "manifest-src 'self'",
            ].join('; '),
          },
          // Additional security headers
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        // API routes with dynamic CORS
        source: '/api/:path*',
        headers: [
          // Only set CORS if APP_URL is configured (production)
          ...(corsOrigin
            ? [
                {
                  key: 'Access-Control-Allow-Origin',
                  value: corsOrigin,
                },
              ]
            : []),
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
});

// Apply bundle analyzer if enabled
const config = bundleAnalyzer
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bundleAnalyzer as any)(nextConfig)
  : nextConfig;

export default config;
