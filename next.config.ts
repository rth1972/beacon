import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.1.19'],
  experimental: {
    hmrHost: '0.0.0.0',
  },
  serverExternalPackages: ['better-sqlite3'],
  output: 'standalone', // needed for Docker
}

export default nextConfig
