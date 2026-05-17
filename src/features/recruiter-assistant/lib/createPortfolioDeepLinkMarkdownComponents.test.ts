import { describe, expect, it } from "vitest";
import { rewritePortfolioDeepLinkHref } from "./createPortfolioDeepLinkMarkdownComponents";

describe("rewritePortfolioDeepLinkHref", () => {
  it("rewrites locale on portfolio hash links", () => {
    expect(
      rewritePortfolioDeepLinkHref("/en#section-experience-item-0", "pt-BR")
    ).toBe("/pt-BR#section-experience-item-0");
  });

  it("rewrites locale on recruiter-assistant professional-context links", () => {
    expect(
      rewritePortfolioDeepLinkHref(
        "/en/recruiter-assistant/professional-context#section-professional-context-item-6",
        "es"
      )
    ).toBe(
      "/es/recruiter-assistant/professional-context#section-professional-context-item-6"
    );
  });

  it("rewrites locale on recruiter-assistant terms links", () => {
    expect(
      rewritePortfolioDeepLinkHref("/en/recruiter-assistant/terms", "it")
    ).toBe("/it/recruiter-assistant/terms");
  });

  it("leaves external URLs unchanged", () => {
    expect(rewritePortfolioDeepLinkHref("https://example.com/foo", "en")).toBe(
      "https://example.com/foo"
    );
  });
});
