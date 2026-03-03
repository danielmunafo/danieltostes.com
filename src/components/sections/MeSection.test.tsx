import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { MeSection } from "./MeSection";

describe("MeSection", () => {
  it("renders the section title", () => {
    renderWithProviders(<MeSection />);
    expect(screen.getByText("About Me")).toBeInTheDocument();
  });

  it("renders all paragraph titles", () => {
    renderWithProviders(<MeSection />);
    expect(
      screen.getByText("The Moment I Discovered I Could Build My Own World")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Building Foundations That Scale")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Beyond Code: Discipline, Creativity, and Continuous Growth"
      )
    ).toBeInTheDocument();
  });

  it("renders paragraph body text", () => {
    renderWithProviders(<MeSection />);
    expect(
      screen.getByText(/I started my journey in technology at 15/)
    ).toBeInTheDocument();
  });

  it("renders the connect note and contact links", () => {
    renderWithProviders(<MeSection />);
    expect(
      screen.getByText(/always open to meaningful conversations/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/dantostes/"
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/danielmunafo"
    );
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:dann.tostes@gmail.com"
    );
  });
});
