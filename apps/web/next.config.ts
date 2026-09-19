import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // общий доменный пакет из монорепо
  transpilePackages: ['@sindikat/domain'],
};

export default nextConfig;
