"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import {
  CONTACT_EMAIL,
  GITHUB_PROFILE_URL,
  LINKEDIN_PROFILE_URL,
  SITE_AUTHOR_DISPLAY_NAME,
} from "@/constants/site";
import { CHIP_BG, getItemSide } from "@/constants/sections";
import { SectionItem } from "./SectionItem";

const CONNECT_LINKS: {
  href: string;
  iconSrc: string;
  labelKey: "linkedinLabel" | "githubLabel" | "emailLabel";
  external: boolean;
}[] = [
  {
    href: LINKEDIN_PROFILE_URL,
    iconSrc: "/linkedin.svg",
    labelKey: "linkedinLabel",
    external: true,
  },
  {
    href: GITHUB_PROFILE_URL,
    iconSrc: "/github.svg",
    labelKey: "githubLabel",
    external: true,
  },
  {
    href: `mailto:${CONTACT_EMAIL}`,
    iconSrc: "/email.svg",
    labelKey: "emailLabel",
    external: false,
  },
];

const SECTION_ID = "me" as const;

const ME_SECTION_IMAGES: { src: string; alt: string; scale?: number }[] = [
  { src: "/me.jpeg", alt: SITE_AUTHOR_DISPLAY_NAME },
  { src: "/time-is-money.svg", alt: "Time is money" },
  { src: "/foundations.svg", alt: "Foundations", scale: 1.1 },
  { src: "/worldwide.svg", alt: "Worldwide" },
  { src: "/hobbies.svg", alt: "Hobbies" },
];

type MeBlock =
  | { title: string; body: string }
  | {
      title: string;
      connectNote: string;
      linkedinLabel: string;
      githubLabel: string;
      emailLabel: string;
    };

function isConnectBlock(block: MeBlock): block is {
  title: string;
  connectNote: string;
  linkedinLabel: string;
  githubLabel: string;
  emailLabel: string;
} {
  return "connectNote" in block;
}

export function MeSection() {
  const t = useTranslations("Me");
  const theme = useTheme();
  const chipBg = CHIP_BG[theme.palette.mode];
  const blocks = t.raw("blocks") as MeBlock[];

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t("title")}
      </Typography>

      {blocks.map((block, idx) => {
        const isLast = idx === blocks.length - 1;

        return (
          <Box key={idx} id={`section-me-item-${idx}`}>
            <SectionItem
              compact
              sectionId={SECTION_ID}
              side={getItemSide(SECTION_ID, idx)}
              iconSrc={
                isConnectBlock(block)
                  ? "/links.svg"
                  : ME_SECTION_IMAGES[idx]?.src
              }
              iconAlt={
                isConnectBlock(block) ? "Links" : ME_SECTION_IMAGES[idx]?.alt
              }
              iconScale={ME_SECTION_IMAGES[idx]?.scale}
            >
              {isConnectBlock(block) ? (
                <>
                  <Typography variant="body1" sx={{ opacity: 0.85 }}>
                    {block.connectNote}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mt: 1.5 }}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    {CONNECT_LINKS.map((link) => (
                      <Chip
                        key={link.labelKey}
                        component="a"
                        href={link.href}
                        {...(link.external && {
                          target: "_blank",
                          rel: "noopener noreferrer",
                        })}
                        icon={
                          <Box
                            component="img"
                            src={link.iconSrc}
                            alt=""
                            sx={{ width: 20, height: 20, objectFit: "contain" }}
                          />
                        }
                        label={block[link.labelKey]}
                        clickable
                        sx={{ backgroundColor: chipBg, color: "inherit" }}
                      />
                    ))}
                  </Stack>
                </>
              ) : (
                <>
                  <Typography
                    variant="h3"
                    component="h3"
                    sx={{ fontWeight: 600 }}
                  >
                    {block.title}
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {block.body}
                  </Typography>
                </>
              )}
            </SectionItem>

            {!isLast && (
              <Divider sx={{ borderColor: "divider", my: { xs: 2, md: 4 } }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
