import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isRecaptchaVerificationEnabled,
  verifyRecaptcha,
} from "../src/security/verifyRecaptcha.js";

describe("verifyRecaptcha", () => {
  const prevSecret = process.env.RECAPTCHA_SECRET_KEY;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
    else process.env.RECAPTCHA_SECRET_KEY = prevSecret;
    vi.restoreAllMocks();
  });

  it("skips verification when RECAPTCHA_SECRET_KEY is unset", async () => {
    delete process.env.RECAPTCHA_SECRET_KEY;
    expect(isRecaptchaVerificationEnabled()).toBe(false);
    const fetchImpl = vi.fn();
    const result = await verifyRecaptcha({
      token: undefined,
      remoteIp: "127.0.0.1",
      fetchImpl,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects missing token when secret is set", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn();
    const result = await verifyRecaptcha({
      token: undefined,
      remoteIp: "127.0.0.1",
      fetchImpl,
    });
    expect(result).toEqual({ ok: false, reason: "missing_token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("accepts successful siteverify response", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
    const result = await verifyRecaptcha({
      token: "valid-token",
      remoteIp: "203.0.113.1",
      fetchImpl,
    });
    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init?.method).toBe("POST");
    const body = init?.body as string;
    expect(body).toContain("secret=test-secret");
    expect(body).toContain("response=valid-token");
    expect(body).toContain("remoteip=203.0.113.1");
  });

  it("rejects failed siteverify response", async () => {
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
        { status: 200 }
      )
    );
    const result = await verifyRecaptcha({
      token: "bad-token",
      remoteIp: undefined,
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("siteverify_failed");
    }
  });
});
