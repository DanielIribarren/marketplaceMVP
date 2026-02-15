import type { NextConfig } from "next";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve(currentDir)
  },
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '127.0.0.1:62840'
  ]
};

export default nextConfig;
