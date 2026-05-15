import { describe, expect, it } from "vitest";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ExperienceSection } from "./ExperienceSection";

describe("ExperienceSection", () => {
  it("renders the section title", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders all company names", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getByText("danieltostes.com")).toBeInTheDocument();
    expect(screen.getByText("Ageras (Kontist)")).toBeInTheDocument();
    expect(screen.getByText("Klarna")).toBeInTheDocument();
    expect(screen.getByText("MercadoLivre")).toBeInTheDocument();
    expect(screen.getByText("Itaú Unibanco")).toBeInTheDocument();
    expect(screen.getByText("PagSeguro PagBank")).toBeInTheDocument();
    expect(screen.getByText("Five Validation")).toBeInTheDocument();
  });

  it("renders role positions and periods", () => {
    renderWithProviders(<ExperienceSection />);
    expect(
      screen.getByText(/Software Engineer \(Personal Project\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/2026 - Present/)).toBeInTheDocument();
    expect(screen.getAllByText(/Aug\/2025/).length).toBeGreaterThan(0);
  });

  it("opens plan dialog when the personal portfolio card is clicked", async () => {
    const mdBody = "## Plan & scope\nStatic-first portfolio.";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("experience/danieltostes-com") && url.includes(".md")) {
        return { ok: true, text: async () => mdBody } as Response;
      }
      return { ok: false } as Response;
    };
    renderWithProviders(<ExperienceSection />);
    fireEvent.click(screen.getByRole("button", { name: /danieltostes\.com/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("danieltostes.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText(/Plan & scope/i)).toBeInTheDocument();
    });
  });

  it("renders role context metadata chips", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getAllByText("Team: 5").length).toBeGreaterThan(0);
    expect(screen.getByText("Sector: E-commerce")).toBeInTheDocument();
    expect(screen.getByText("Domain: Marketing")).toBeInTheDocument();
  });

  it("renders tech chips for roles", () => {
    renderWithProviders(<ExperienceSection />);
    expect(screen.getAllByText("Node.js").length).toBeGreaterThan(0);
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
  });
});
