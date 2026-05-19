"use client";

import MuiLink from "@mui/material/Link";
import NextLink from "next/link";
import type { Components } from "react-markdown";
import type { MouseEvent } from "react";
import { isValidLocale, LOCALES, type Locale } from "@/i18n/request";
import {
  navigateToLocationHashTarget,
  stashPendingLocationHash,
} from "@/lib/locationHash";
import { flushRecruiterChatSession } from "./recruiter-chat-session-flush";

const LOCALE_PORTFOLIO_HASH_PATTERN = new RegExp(
  `^\\/(${LOCALES.join("|")})(#[\\w-]*)?$`
);

const LOCALE_RECRUITER_README_PATTERN = new RegExp(
  `^\\/(${LOCALES.join("|")})\\/recruiter-assistant\\/(terms|professional-context)(#[\\w-]*)?$`
);

/**
 * Rewrites `/<locale>#hash` and `/<locale>/recruiter-assistant/…#hash` deep links
 * to the visitor's active locale so links stay in-language when chunk metadata
 * used another locale.
 */
export function rewritePortfolioDeepLinkHref(
  href: string,
  currentLocale: Locale
): string {
  const portfolioMatch = LOCALE_PORTFOLIO_HASH_PATTERN.exec(href);
  if (portfolioMatch) {
    const hash = portfolioMatch[2] ?? "";
    return `/${currentLocale}${hash}`;
  }
  const readmeMatch = LOCALE_RECRUITER_README_PATTERN.exec(href);
  if (readmeMatch) {
    const subroute = readmeMatch[2];
    const hash = readmeMatch[3] ?? "";
    return `/${currentLocale}/recruiter-assistant/${subroute}${hash}`;
  }
  return href;
}

function normalizePortfolioPathname(pathname: string): string {
  const withoutTrailingSlashes = pathname.replace(/\/+$/, "");
  return withoutTrailingSlashes === "" ? "/" : withoutTrailingSlashes;
}

/**
 * When the document is already at the same path and hash, the browser and
 * Next.js client navigation typically no-op; scroll to the target anyway so
 * repeat clicks from references still bring the section into view.
 */
function handlePortfolioDeepLinkClick(
  event: MouseEvent<HTMLAnchorElement>,
  pathHref: string
): void {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) return;
  if (event.defaultPrevented) return;
  const isNonPrimaryClick = event.button !== 0;
  if (isNonPrimaryClick) return;
  const isModifiedClick =
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  if (isModifiedClick) return;

  let url: URL;
  try {
    url = new URL(pathHref, window.location.origin);
  } catch {
    return;
  }
  const id = url.hash.slice(1).trim();
  if (!id) return;

  const targetPath = normalizePortfolioPathname(url.pathname);
  const currentPath = normalizePortfolioPathname(window.location.pathname);
  if (targetPath === currentPath) {
    event.preventDefault();
    navigateToLocationHashTarget(id);
    return;
  }

  stashPendingLocationHash(pathHref);
}

/**
 * Renders markdown `a` nodes: in-app `/<locale>#…` uses Next.js navigation; other
 * URLs open in a new tab.
 */
export function createPortfolioDeepLinkMarkdownComponents(
  localeProp: string
): Partial<Components> {
  const locale = isValidLocale(localeProp) ? localeProp : "en";
  return {
    a(props) {
      const { href, children, node, onClick: propsOnClick, className } = props;
      void node;
      if (!href || typeof href !== "string") {
        return <span className={className}>{children}</span>;
      }
      const resolvedHref = rewritePortfolioDeepLinkHref(href, locale);
      const isSameSitePath =
        resolvedHref.startsWith("/") && !resolvedHref.startsWith("//");
      if (isSameSitePath) {
        return (
          <MuiLink
            component={NextLink}
            href={resolvedHref}
            underline="hover"
            className={className}
            onClick={(e) => {
              flushRecruiterChatSession();
              handlePortfolioDeepLinkClick(e, resolvedHref);
              propsOnClick?.(e);
            }}
          >
            {children}
          </MuiLink>
        );
      }
      return (
        <MuiLink
          href={resolvedHref}
          underline="hover"
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {children}
        </MuiLink>
      );
    },
  };
}
