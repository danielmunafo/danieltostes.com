import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const I18N_REQUEST_PATH = "./src/i18n/request.ts";
const PWA_DEST = "public";
const NODE_ENV_DEV = "development";
const OUTPUT_STATIC_EXPORT = "export";

const withNextIntl = createNextIntlPlugin(I18N_REQUEST_PATH);

const withPWA = withPWAInit({
  dest: PWA_DEST,
  register: true,
  disable: process.env.NODE_ENV === NODE_ENV_DEV,
});

const nextConfig: NextConfig = {
  output: OUTPUT_STATIC_EXPORT,
};

export default withPWA(withNextIntl(nextConfig));
