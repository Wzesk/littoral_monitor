/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: { serverComponentsExternalPackages: ['@google-cloud/bigquery'] },
  async headers() {
    return [
      {
        source: '/design-system/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
}

export default nextConfig
