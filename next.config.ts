import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
