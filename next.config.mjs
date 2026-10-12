import os from 'node:os';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NODE_ENV !== 'production' && {
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
};

export default nextConfig;
