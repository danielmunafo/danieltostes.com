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
    expect(screen.getByText(/Get in touch/)).toBeInTheDocument();
  });

  it("renders contact links", () => {
    renderWithProviders(<MeSection />);
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
