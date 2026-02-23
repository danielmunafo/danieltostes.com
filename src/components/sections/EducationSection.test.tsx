import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { EducationSection } from "./EducationSection";

describe("EducationSection", () => {
  it("renders the section title", () => {
    renderWithProviders(<EducationSection />);
    expect(screen.getByText("Education & Courses")).toBeInTheDocument();
  });

  it("renders degree names", () => {
    renderWithProviders(<EducationSection />);
    expect(
      screen.getByText("Technologist in Systems Analysis and Development")
    ).toBeInTheDocument();
    expect(screen.getByText("Technician in Informatics")).toBeInTheDocument();
  });

  it("renders institution names", () => {
    renderWithProviders(<EducationSection />);
    expect(screen.getByText("FATEC José Crespo Gonzales")).toBeInTheDocument();
    expect(screen.getByText("ETEC Fernando Prestes")).toBeInTheDocument();
  });

  it("renders the courses sub-section", () => {
    renderWithProviders(<EducationSection />);
    expect(screen.getByText("Courses")).toBeInTheDocument();
    expect(screen.getByText(/Architecting on AWS/)).toBeInTheDocument();
  });

  it("renders language chips", () => {
    renderWithProviders(<EducationSection />);
    expect(screen.getByText(/Portuguese — Native/)).toBeInTheDocument();
    expect(screen.getByText(/English — Fluent/)).toBeInTheDocument();
  });

  it("renders work permit chips", () => {
    renderWithProviders(<EducationSection />);
    expect(screen.getByText(/EU/)).toBeInTheDocument();
    expect(screen.getByText(/Brazil/)).toBeInTheDocument();
  });
});
