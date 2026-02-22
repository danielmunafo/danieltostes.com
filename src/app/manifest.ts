import type { MetadataRoute } from "next";
import {
  BACKGROUND_LIGHT,
  PWA_FAVICON_SRC,
  PWA_START_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  THEME_COLOR_PRIMARY,
} from "@/constants/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: PWA_START_URL,
    display: "standalone",
    background_color: BACKGROUND_LIGHT,
    theme_color: THEME_COLOR_PRIMARY,
    icons: [
      {
        src: PWA_FAVICON_SRC,
        sizes: "any",
        type: "image/x-icon",
        purpose: "any",
      },
    ],
  };
}
