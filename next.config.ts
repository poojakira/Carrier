import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable X-Powered-By header
  // (Next.js 15.5+ handles this via headers() below)

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HTTPS enforcement
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
