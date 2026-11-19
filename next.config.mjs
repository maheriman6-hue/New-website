import os from 'node:os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    qualities: [75, 90],
    remotePatterns: [],
  },
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'localhost',
      ...new Set(
        Object.values(os.networkInterfaces())
          .flatMap((addresses) => addresses ?? [])
          .filter((address) => address.family === 'IPv4' && !address.internal)
          .map((address) => address.address),
      ),
    ],
  }),
  async headers() {
    const commonHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      ...(process.env.NODE_ENV === 'production'
        ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          }]
        : []),
    ];

    const publicContentSecurityPolicy = [
      "default-src 'self'",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://www.google.com/images/cleardot.gif",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebasestorage.googleapis.com",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    const adminContentSecurityPolicy = [
      "default-src 'self'",
      "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://www.google.com/images/cleardot.gif",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://firebasestorage.googleapis.com https://storage.googleapis.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.web.app",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
    ].join('; ');

    return [
      {
        source: '/((?!admin).*)',
        headers: [
          ...commonHeaders,
          { key: 'Content-Security-Policy', value: publicContentSecurityPolicy },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          ...commonHeaders,
          { key: 'Content-Security-Policy', value: adminContentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
