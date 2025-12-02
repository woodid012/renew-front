// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    LOCAL_BACKEND_URL: process.env.LOCAL_BACKEND_URL || 'http://localhost:10000',
  },
}

module.exports = nextConfig