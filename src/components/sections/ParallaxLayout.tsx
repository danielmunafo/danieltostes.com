"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SECTION_IDS, type SectionId } from "@/constants/sections";
import { useActiveSection } from "@/hooks/useActiveSection";
import { SectionBackground } from "./SectionBackground";
import { ParallaxSection } from "./ParallaxSection";
import { SummarySection } from "./SummarySection";
import { ImpactSection } from "./ImpactSection";
import { ExperienceSection } from "./ExperienceSection";
import { EducationSection } from "./EducationSection";
import { MeSection } from "./MeSection";

const SECTION_CONTENT: Record<SectionId, React.ComponentType> = {
  summary: SummarySection,
  impact: ImpactSection,
  experience: ExperienceSection,
  education: EducationSection,
  me: MeSection,
};

/**
 * Top-level parallax page: a fixed background layer with crossfading section
 * colors and parallax scroll, plus a foreground column of content sections.
 */
export function ParallaxLayout() {
  const { activeSection, previousSection, previousSectionOpacity } =
    useActiveSection();

  return (
    <Box sx={{ position: "relative", overflowX: "hidden" }}>
      <SectionBackground
        activeSection={activeSection}
        previousSection={previousSection}
        previousSectionOpacity={previousSectionOpacity}
      />

      {SECTION_IDS.map((id, idx) => {
        const Content = SECTION_CONTENT[id];
        const isLast = idx === SECTION_IDS.length - 1;
        const isFirst = idx === 0;
        const compactSections = new Set<SectionId>(["summary", "impact"]);
        const compact = isLast || compactSections.has(id);
        return (
          <ParallaxSection
            key={id}
            sectionId={id}
            compact={compact}
            isFirst={isFirst}
          >
            <Content />
          </ParallaxSection>
        );
      })}

      <Typography
        variant="body2"
        sx={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          py: 3,
          color: "text.secondary",
          opacity: 0.7,
        }}
      >
        Daniel Tostes &mdash; 2026 &mdash; dann.tostes@gmail.com &mdash; All
        rights reserved
      </Typography>
    </Box>
  );
}
