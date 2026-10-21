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
    const headers = [
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
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "img-src 'self' data: blob:",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self'",
          `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
          "connect-src 'self'",
          "form-action 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          'upgrade-insecure-requests',
        ].join('; '),
      },
      ...(process.env.NODE_ENV === 'production'
        ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          }]
        : []),
    ];

    return [{
      source: '/:path*',
      headers,
    }];
  },
};

export default nextConfig;
