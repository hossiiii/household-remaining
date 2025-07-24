/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: [],
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'next-auth.session-token',
            value: undefined,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig