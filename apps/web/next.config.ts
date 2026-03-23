import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@line-saas/shared', '@line-saas/db'],
  async rewrites() {
    // In production, proxy API requests through the frontend domain
    // so cookies are first-party (same-origin) instead of third-party
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || apiUrl.includes('localhost')) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
