/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Optimize bundle by excluding unused Supabase realtime
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@supabase/realtime-js': false,
      }
    }
    return config
  },
  
  // Optimize builds
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  }
}

module.exports = nextConfig