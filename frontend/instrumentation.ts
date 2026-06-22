// Next.js の計装フック
// サーバー側の例外を一つの集約関数に集めるため
// 今は構造化ログだが、Sentryなどへの接続点として残す。
import type { Instrumentation } from "next";
import { captureError } from "@/lib/server/observability";

export const onRequestError: Instrumentation.onRequestError = (
  err,
  request,
  context,
) => {
  captureError("request", err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
};
