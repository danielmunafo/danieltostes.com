import { describe, expect, it } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { SectionItem } from "./SectionItem";

describe("SectionItem", () => {
  it("when interactive and onClick are provided, wrapper is focusable and clickable", () => {
    const handleClick = vi.fn();
    renderWithProviders(
      <SectionItem
        sectionId="summary"
        side="left"
        iconSrc="/logo.svg"
        iconAlt="Test"
        interactive
        onClick={handleClick}
      >
        <span>Content</span>
      </SectionItem>
    );
    const button = screen.getByRole("button", { name: /content/i });
    expect(button).toHaveAttribute("tabIndex", "0");
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
