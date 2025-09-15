/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: [
      'bisimqmtxjsptehhqpeg.supabase.co',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.line-scdn.net',
      },
      {
        protocol: 'https',
        hostname: 'scdn.line-apps.com',
      },
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
      {
        protocol: 'https',
        hostname: 'sprofile.line-scdn.net',
      },
      {
        protocol: 'https',
        hostname: 'api.line.me',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Optimize bundle by excluding unused dependencies
  webpack: (config, { isServer, dev }) => {
    // Fix cache serialization performance warning
    config.cache = {
      ...config.cache,
      compression: 'gzip',
      maxMemoryGenerations: 1,
    }

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@supabase/realtime-js': false,
      }

      // Exclude Node.js APIs from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: false,
        fs: false,
        net: false,
        tls: false,
      }
    }

    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      )
    }
    
    // Optimize chunks
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for common libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk for shared components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            },
            // Admin components chunk
            admin: {
              name: 'admin',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]admin[\\/]/,
              priority: 30
            },
            // Staff schedule components chunk
            staffSchedule: {
              name: 'staff-schedule',
              chunks: 'all',
              test: /[\\/]src[\\/]components[\\/]staff-schedule[\\/]/,
              priority: 25
            }
          }
        }
      }
    }
    
    return config
  },
  
  // Optimize builds
  serverExternalPackages: ['@supabase/realtime-js'],
  experimental: {
  },
  
  // Compression
  compress: true,
  
  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/api/staff-schedule/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          }
        ]
      }
    ]
  },
  
  // Redirects for performance
  async redirects() {
    return [
      {
        source: '/admin/staff-scheduling/schedules',
        destination: '/admin/staff-scheduling',
        permanent: true
      }
    ]
  },
  
  // PWA and service worker support
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/_next/static/sw.js'
      }
    ]
  }
}

module.exports = nextConfig