/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://${process.env.BACKEND_HOST || "backend"}:${process.env.BACKEND_PORT || "23101"}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
