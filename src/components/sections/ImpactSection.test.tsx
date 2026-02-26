import { describe, expect, it } from "vitest";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ImpactSection } from "./ImpactSection";

describe("ImpactSection", () => {
  it("renders the impact title and items", () => {
    renderWithProviders(<ImpactSection />);
    expect(screen.getByText("Selected Impact")).toBeInTheDocument();
    expect(
      screen.getByText(/Delivered New Cloud-Native Financial Workflow/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Event-Driven Systems for Multi-Market/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Observability Frameworks for Data-Driven/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AI-Integrated Product Architecture/)
    ).toBeInTheDocument();
  });

  it("opens dialog with detail when an impact item is clicked", async () => {
    const mdBody = "## Mobile Overdraft\n*Associated with Itaú Unibanco*";
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
      within(dialog).getByText(
        /Mobile Overdraft Hiring - Distributed SAGA Orchestrator/
      )
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(within(dialog).getByText(/Itaú Unibanco/)).toBeInTheDocument();
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
