"use client";

import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export function HomeContent() {
  const t = useTranslations("Home");

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="h1" gutterBottom>
          {t("title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("subtitle")}
        </Typography>
      </Box>
    </Container>
  );
}
