import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { THEME_MODE_DARK, THEME_MODE_LIGHT } from "@/constants/site";
import { TopBar } from "./TopBar";

vi.mock("./LocaleSwitcher", () => ({
  LocaleSwitcher: () => <button>English</button>,
}));
vi.mock("./ThemeToggle", () => ({
  ThemeToggle: () => <button>Toggle</button>,
}));

describe("TopBar", () => {
  it("renders the author name", () => {
    renderWithProviders(<TopBar />);
    expect(screen.getByText("Daniel Tostes")).toBeInTheDocument();
  });

  it("renders locale and theme controls", () => {
    renderWithProviders(<TopBar />);
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Toggle")).toBeInTheDocument();
  });

  it("renders in both theme modes without error", () => {
    const { unmount } = renderWithProviders(<TopBar />, {
      mode: THEME_MODE_LIGHT,
    });
    expect(screen.getByText("Daniel Tostes")).toBeInTheDocument();
    unmount();

    renderWithProviders(<TopBar />, { mode: THEME_MODE_DARK });
    expect(screen.getByText("Daniel Tostes")).toBeInTheDocument();
  });
});
