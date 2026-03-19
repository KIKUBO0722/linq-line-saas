import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@line-saas/shared', '@line-saas/db'],
};

export default nextConfig;
