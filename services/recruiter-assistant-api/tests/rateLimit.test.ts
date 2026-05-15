import { describe, expect, it, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimitForTests,
} from "../src/security/rateLimit.js";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it("allows up to max requests in window", () => {
    const ip = "10.0.0.1";
    const t0 = 1_000_000;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(ip, t0)).toBe(true);
    }
    expect(checkRateLimit(ip, t0)).toBe(false);
  });

  it("resets after window elapses", () => {
    const ip = "10.0.0.2";
    const t0 = 0;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(ip, t0)).toBe(true);
    }
    expect(checkRateLimit(ip, t0)).toBe(false);
    const tLater = t0 + 10 * 60 * 1000 + 1;
    expect(checkRateLimit(ip, tLater)).toBe(true);
  });
});
