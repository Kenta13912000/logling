import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { PrivacyPage } from "./PrivacyPage";

test("AC-30: 何をどこにしまうか、だれが読めるか、ログアウトと退会、Google の許可の取り消し方が書かれている", () => {
  render(<PrivacyPage />);

  for (const heading of [
    "ログインしないで使うとき",
    "ログインして使うとき",
    "Google から受け取るもの",
    "だれが読めるか",
    "ログアウトと退会",
    "Google でのログインの許可を取り消すには",
    "問い合わせ",
  ]) {
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
  }
  const main = screen.getByRole("main");
  expect(main).toHaveTextContent("ほかの場所には送りません");
  expect(main).toHaveTextContent("インターネット上にある logling の保管場所");
  expect(main).toHaveTextContent(
    "メールアドレスと、あなたの Google アカウントを見分けるための番号だけ",
  );
  expect(main).toHaveTextContent("名前や写真は残しません");
  expect(main).toHaveTextContent("ログインしたあなただけ");
  expect(main).toHaveTextContent(
    "不具合を調べるときなど、どうしても必要なとき以外は見ません",
  );
  expect(main).toHaveTextContent("ログインしてから 1 日以内");
  expect(main).toHaveTextContent("サードパーティ製のアプリとサービス");
});

test("AC-30: だれにでもわかるように、専門の言葉を使わない", () => {
  render(<PrivacyPage />);

  const text = screen.getByRole("main").textContent ?? "";
  for (const jargon of [
    "クラウド",
    "DB",
    "データベース",
    "サーバー",
    "トークン",
    "ID",
    "ストレージ",
  ]) {
    expect(text).not.toContain(jargon);
  }
});

test("pwa-reminder AC-19: 「お知らせ」の節に、使える人・預かるもの・Apple や Google のしくみを通ること・本文が入らないこと・消し方が書いてある", () => {
  render(<PrivacyPage />);

  const heading = screen.getByRole("heading", { name: "お知らせ" });
  const section = heading.closest("section")!;
  expect(section).toHaveTextContent(
    "「書き忘れのお知らせ」をオンにした人（ログイン中の人）だけ",
  );
  expect(section).toHaveTextContent(
    "この端末へのお知らせの宛先・選んだ時刻・タイムゾーンを預かり",
  );
  expect(section).toHaveTextContent("まだ日記を書いていない日だけ");
  expect(section).toHaveTextContent("Apple や Google などのしくみを通って");
  expect(section).toHaveTextContent("日記の本文は入りません");
  expect(section).toHaveTextContent(
    "「設定」でオフにする・ログアウト・退会のどれかで、預かったものは消えます",
  );

  // Right after 「ログアウトと退会」.
  const logout = screen.getByRole("heading", { name: "ログアウトと退会" });
  expect(
    logout.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("AC-30: 問い合わせは GitHub のページから", () => {
  render(<PrivacyPage />);

  expect(
    screen.getByRole("link", { name: /GitHub の logling のページ/ }),
  ).toHaveAttribute("href", "https://github.com/Kenta13912000/logling/issues");
});

// tab-navigation: the way back home moved to the tabs (TabBar.test).
test("tab-navigation AC-8: 説明ページに、上の帯と「‹ ホーム」のリンクはない", () => {
  render(<PrivacyPage />);

  expect(
    screen.queryByRole("link", { name: /ホーム/ }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
});
