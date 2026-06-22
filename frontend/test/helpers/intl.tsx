import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/ja.json";

// next-intl を使うコンポーネントを ja メッセージでラップして描画する（テスト用）。
export function renderIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="ja" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}
