import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { MeSection } from "./MeSection";

describe("MeSection", () => {
  it("renders the section title", () => {
    renderWithProviders(<MeSection />);
    expect(screen.getByText("About Me")).toBeInTheDocument();
  });

  it("renders the placeholder text", () => {
    renderWithProviders(<MeSection />);
    expect(screen.getByText(/Coming soon/)).toBeInTheDocument();
  });
});
