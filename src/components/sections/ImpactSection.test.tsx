import { describe, expect, it } from "vitest";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ImpactSection } from "./ImpactSection";

describe("ImpactSection", () => {
  it("renders the impact title and items", () => {
    renderWithProviders(<ImpactSection />);
    expect(screen.getByText("Selected Impact")).toBeInTheDocument();
    expect(
      screen.getByText(/AI-Driven Warranty Claim Automation Platform/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI-Driven Personalized Content in Transactional Emails/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mobile Overdraft Hiring - Distributed SAGA Orchestrator/
      )
    ).toBeInTheDocument();
  });

  it("opens dialog with detail when an impact item is clicked", async () => {
    const mdBody =
      "## Warranty Claims\n*Confidential Client Engagement (Contract)*";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("impact/0") && url.includes(".md"))
        return { ok: true, text: async () => mdBody } as Response;
      return { ok: false } as Response;
    };
    renderWithProviders(<ImpactSection />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/AI-Driven Warranty Claim Automation Platform/)
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText(/Warranty Claims/)).toBeInTheDocument();
    });
    expect(
      within(dialog).getByRole("button", { name: /close/i })
    ).toBeInTheDocument();
  });

  it("closes dialog when Close button is clicked", async () => {
    renderWithProviders(<ImpactSection />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /close/i })
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
