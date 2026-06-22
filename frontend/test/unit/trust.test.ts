// 【unit】lib/trust の信頼ファクトのコアルール（deriveStatus の状態導出・buildTrustReport の根拠/出典/Watcher）を検証。純関数・時刻は固定。
import { describe, expect, it } from "vitest";
import { buildTrustReport, deriveStatus } from "@/lib/trust";
import { reactRepo, plainArchivedRepo } from "../helpers/fixtures";

// status は時刻に依存しないが、説明文の相対表記のため now を固定して再現性を担保する。
const NOW = new Date("2026-06-11T00:00:00Z").getTime();

describe("deriveStatus（状態の導出・100% live）", () => {
  it("更新中のリポジトリは active", () => {
    const s = deriveStatus(reactRepo, NOW);
    expect(s.status).toBe("active");
    expect(s.tone).toBe("ok");
  });

  it("アーカイブされていれば archived", () => {
    const s = deriveStatus(plainArchivedRepo, NOW);
    expect(s.status).toBe("archived");
    expect(s.tone).toBe("muted");
  });
});

describe("buildTrustReport", () => {
  it("evidence は3点で、すべて出典 href と値を持つ", () => {
    const r = buildTrustReport(reactRepo, { now: NOW });
    expect(r.evidence).toHaveLength(3);
    for (const e of r.evidence) {
      expect(e.source.href).toMatch(/^https?:\/\//);
      expect(e.value.length).toBeGreaterThan(0);
    }
  });

  it("watcher は subscribers_count（正確な Watcher）を採用する", () => {
    const r = buildTrustReport(reactRepo, { now: NOW });
    expect(r.watcher).toBe(reactRepo.subscribers_count);
  });
});