"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { restorePreservedLocationHash } from "@/lib/locationHash";

/** Re-applies hash fragments Next.js may drop on hydration or client navigation. */
export function useRestorePreservedLocationHash(): void {
  const pathname = usePathname();

  useEffect(() => {
    restorePreservedLocationHash();
  }, [pathname]);
}
