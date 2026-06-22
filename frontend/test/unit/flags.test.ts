// 【unit】lib/flags のフィーチャーフラグ解決（環境変数のパース・既定値）を検証。
import { describe, it, expect, vi, afterEach } from "vitest";

// flags は import 時に process.env を読むため、env を差し替えたら resetModules して再 import する。
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("feature flags（148）", () => {
  it("未設定は既定 ON（後方互換）", async () => {
    vi.resetModules();
    const { flags } = await import("@/lib/flags");
    expect(flags.osvCrossCheck).toBe(true);
    expect(flags.epss).toBe(true);
    expect(flags.compare).toBe(true);
  });

  it('"0" / "false" / "off" で無効化される', async () => {
    vi.stubEnv("FEATURE_OSV_CROSSCHECK", "0");
    vi.stubEnv("FEATURE_EPSS", "false");
    vi.stubEnv("FEATURE_COMPARE", "off");
    vi.resetModules();
    const { flags } = await import("@/lib/flags");
    expect(flags.osvCrossCheck).toBe(false);
    expect(flags.epss).toBe(false);
    expect(flags.compare).toBe(false);
  });

  it('"1" / "true" は ON', async () => {
    vi.stubEnv("FEATURE_OSV_CROSSCHECK", "1");
    vi.stubEnv("FEATURE_EPSS", "true");
    vi.resetModules();
    const { flags } = await import("@/lib/flags");
    expect(flags.osvCrossCheck).toBe(true);
    expect(flags.epss).toBe(true);
  });
});