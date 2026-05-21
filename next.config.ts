import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['192.168.1.19'],
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
