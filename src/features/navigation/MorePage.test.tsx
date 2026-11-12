import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { authMock, signInAs } from "@/test/mocks";

import { MorePage } from "./MorePage";

const accountLink = () => screen.getByRole("link", { name: /アカウント/ });

test("AC-5: 「その他」に、アカウント・日記の保存のしかた・設定が並び、それぞれの画面へ行く", () => {
  render(<MorePage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "その他" }),
  ).toBeInTheDocument();
  expect(accountLink()).toHaveAttribute("href", "/account");
  expect(
    screen.getByRole("link", { name: /日記の保存のしかた/ }),
  ).toHaveAttribute("href", "/privacy");
  expect(screen.getByRole("link", { name: /設定/ })).toHaveAttribute(
    "href",
    "/settings",
  );
  expect(screen.getAllByRole("link")).toHaveLength(3);
});

test("AC-6: ログインしていないときは、アカウントの項目に「ログインしていない」と添えてある", () => {
  render(<MorePage />);

  expect(accountLink()).toHaveTextContent("ログインしていない");
});

test("AC-6: ログイン中は、アカウントの項目にメールアドレスが添えてある", () => {
  signInAs("you@example.com");
  render(<MorePage />);

  expect(accountLink()).toHaveTextContent("ログイン中：you@example.com");
  expect(accountLink()).not.toHaveTextContent("ログインしていない");
});

test("AC-6: ログインしているかを確かめている間は、どちらとも書かない", () => {
  authMock.isPending = true;
  render(<MorePage />);

  expect(accountLink()).not.toHaveTextContent("ログインしていない");
  expect(accountLink()).not.toHaveTextContent("ログイン中");
});

// Moved here from the home page's tests: the top bar's link became this row.
test("account-sync AC-2: 「その他」の「アカウント」から、アカウントの画面に行ける", () => {
  render(<MorePage />);

  expect(accountLink()).toHaveAttribute("href", "/account");
});
