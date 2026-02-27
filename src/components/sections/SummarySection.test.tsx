import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { SummarySection } from "./SummarySection";

describe("SummarySection", () => {
  it("renders the section title", () => {
    renderWithProviders(<SummarySection />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    renderWithProviders(<SummarySection />);
    expect(screen.getByText(/Senior Software Engineer/)).toBeInTheDocument();
  });

  it("renders skill category labels", () => {
    renderWithProviders(<SummarySection />);
    expect(screen.getByText(/Core:/)).toBeInTheDocument();
    expect(screen.getByText(/Architecture:/)).toBeInTheDocument();
    expect(screen.getByText(/Infra & Ops:/)).toBeInTheDocument();
    expect(screen.getByText(/AI:/)).toBeInTheDocument();
  });

  it("renders skill chips", () => {
    renderWithProviders(<SummarySection />);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("AWS")).toBeInTheDocument();
  });
});
