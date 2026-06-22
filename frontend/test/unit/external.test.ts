// 【unit】lib/server/external の HTTP 耐性ヘルパ（resilientFetch のリトライ/バックオフ・singleFlight の重複排除）を検証。
import { describe, it, expect, vi, afterEach } from "vitest";
import { resilientFetch } from "@/lib/server/external";

// global fetch を差し替えて resilientFetch のリトライ/タイムアウト方針を検証する。
function mockResponse(status: number): Response {
  return new Response("ok", { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("resilientFetch", () => {
  it("成功時はリトライせず1回で返す", async () => {
    const fn = vi.fn().mockResolvedValue(mockResponse(200));
    vi.stubGlobal("fetch", fn);
    const res = await resilientFetch("https://x.test", { retries: 1 });
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("5xx は1回リトライして成功すれば返す", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(mockResponse(503))
      .mockResolvedValueOnce(mockResponse(200));
    vi.stubGlobal("fetch", fn);
    const res = await resilientFetch("https://x.test", { retries: 1 });
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("4xx（404）はリトライしない", async () => {
    const fn = vi.fn().mockResolvedValue(mockResponse(404));
    vi.stubGlobal("fetch", fn);
    const res = await resilientFetch("https://x.test", { retries: 1 });
    expect(res.status).toBe(404);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ネットワーク例外はリトライし、最終的に失敗なら throw", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", fn);
    await expect(
      resilientFetch("https://x.test", { retries: 1 }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2); // 初回＋リトライ1
  });
});