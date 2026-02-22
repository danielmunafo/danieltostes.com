import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const I18N_REQUEST_PATH = "./src/i18n/request.ts";
const OUTPUT_STATIC_EXPORT = "export";

const withNextIntl = createNextIntlPlugin(I18N_REQUEST_PATH);

const nextConfig: NextConfig = {
  output: OUTPUT_STATIC_EXPORT,
};

export default withNextIntl(nextConfig);
