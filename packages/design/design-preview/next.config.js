import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* 直接指向源码而非 dist：预览面的用途就是看改动的即时效果，走构建产物等于
 * 每改一行都要重新 build。产品不这么做——它们消费发布出去的包。 */
const alias = "../../design-system/src/client.ts";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { webpackBuildWorker: false },
  transpilePackages: ["@vxture/design-system"],
  turbopack: {
    resolveAlias: { "@vxture/design-system": alias },
  },
  webpack: (config) => {
    config.resolve.alias["@vxture/design-system"] = join(__dirname, alias);
    return config;
  },
};

export default nextConfig;
