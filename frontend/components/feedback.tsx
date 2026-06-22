"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { sendEvent } from "@/components/analytics";
import { reportIssueUrl } from "@/lib/site";

// フィードバックループ（200）。「役立った/おかしい」を件数のみ送る（プライバシー配慮）。
// 事実提示の継続改善の入力。採点ではなく、提示の質の手がかり。
// 89 訂正可能性：「おかしい」を選んだ後に、具体的な訂正報告（issue）への導線を出す。
export function FeedbackButtons({ subject }: { subject?: string }) {
  const t = useTranslations("detail");
  const [done, setDone] = useState<"helpful" | "wrong" | null>(null);

  if (done) {
    return (
      <p className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status">
        {t("fbThanks")}
        {done === "wrong" && subject ? (
          <a
            href={reportIssueUrl(subject)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("fbReport")} ↗
          </a>
        ) : null}
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">{t("fbQuestion")}</span>
      <button
        type="button"
        onClick={() => {
          sendEvent("feedback_helpful");
          setDone("helpful");
        }}
        className="rounded-md border px-2.5 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {t("fbHelpful")}
      </button>
      <button
        type="button"
        onClick={() => {
          sendEvent("feedback_wrong");
          setDone("wrong");
        }}
        className="rounded-md border px-2.5 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {t("fbWrong")}
      </button>
    </div>
  );
}
