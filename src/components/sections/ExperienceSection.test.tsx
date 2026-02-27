import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ExperienceSection } from "./ExperienceSection";

describe("ExperienceSection", () => {
  it("renders the section title", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders all company names", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText("Personal Fitness Platform")).toBeInTheDocument();
    expect(screen.getByText("Ageras (Kontist)")).toBeInTheDocument();
    expect(screen.getByText("Klarna")).toBeInTheDocument();
    expect(screen.getByText("MercadoLivre")).toBeInTheDocument();
    expect(screen.getByText("Itaú Unibanco")).toBeInTheDocument();
    expect(screen.getByText("PagSeguro PagBank")).toBeInTheDocument();
    expect(screen.getByText("Five Validation")).toBeInTheDocument();
  });

  it("renders role positions and periods", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText(/Founder & Software Engineer/)).toBeInTheDocument();
    expect(screen.getAllByText(/Jul\/2025|Aug\/2025/).length).toBeGreaterThan(
      0
    );
  });

  it("renders tech chips for roles", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getAllByText("Node.js").length).toBeGreaterThan(0);
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
  });
});
