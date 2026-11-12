import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { TabBar } from "./TabBar";

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

beforeEach(() => {
  nav.pathname = "/";
});

const menu = () => screen.getByRole("navigation", { name: "メインメニュー" });

test("AC-1, AC-4: 「メインメニュー」のまとまりに、3 つのタブがアイコンと名前で並び、それぞれの画面へ行く", () => {
  render(<TabBar />);

  expect(within(menu()).getAllByRole("link")).toHaveLength(3);
  for (const [name, href] of [
    ["ホーム", "/"],
    ["ふりかえる", "/history"],
    ["その他", "/more"],
  ]) {
    // The exact name shows the icon is not read out.
    const link = within(menu()).getByRole("link", { name });
    expect(link).toHaveAttribute("href", href);
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  }
});

test.each([
  ["/", "ホーム"],
  ["/history", "ふりかえる"],
  ["/more", "その他"],
  ["/account", "その他"],
  ["/privacy", "その他"],
  ["/settings", "その他"],
])(
  "AC-3: %s では「%s」のタブにだけ、今のページの印が付く",
  (pathname, name) => {
    nav.pathname = pathname;
    render(<TabBar />);

    const current = within(menu()).getAllByRole("link", { current: "page" });
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(name);
  },
);

test("AC-3: どのタブにも入らないページでは、今のページの印はどこにも付かない", () => {
  nav.pathname = "/no-such-page";
  render(<TabBar />);

  expect(
    within(menu()).queryAllByRole("link", { current: "page" }),
  ).toHaveLength(0);
});

describe("文字を打っている間", () => {
  function renderWithFields() {
    render(
      <>
        <label>
          日記
          <textarea />
        </label>
        <label>
          名前
          <input type="text" />
        </label>
        <label>
          えらぶ
          <input type="checkbox" />
        </label>
        <button type="button">のこす</button>
        <TabBar />
      </>,
    );
  }

  const tabsShown = () =>
    screen.queryByRole("navigation", { name: "メインメニュー" }) !== null;

  test("AC-9: 入力欄が選ばれている間はタブが隠れ、入力欄から離れると、また出る", async () => {
    const user = userEvent.setup();
    renderWithFields();
    expect(tabsShown()).toBe(true);

    await user.click(screen.getByLabelText("日記"));
    expect(tabsShown()).toBe(false);

    await user.click(screen.getByRole("button", { name: "のこす" }));
    expect(tabsShown()).toBe(true);
  });

  test("AC-9: 入力欄から別の入力欄に移っても、隠れたまま", async () => {
    const user = userEvent.setup();
    renderWithFields();

    await user.click(screen.getByLabelText("日記"));
    await user.click(screen.getByLabelText("名前"));
    expect(tabsShown()).toBe(false);
  });

  test("AC-9: 文字を打つ欄でないもの（チェックボックス）が選ばれても、隠れない", async () => {
    const user = userEvent.setup();
    renderWithFields();

    await user.click(screen.getByLabelText("えらぶ"));
    expect(tabsShown()).toBe(true);
  });
});

// Moved here from the pages' tests: the links in the top bar became tabs.
describe("これまでの機能の移り方", () => {
  test("diary-history AC-1, AC-2: 下のタブから、ふりかえりにもホームにも行ける", () => {
    nav.pathname = "/history";
    render(<TabBar />);

    expect(
      within(menu()).getByRole("link", { name: "ふりかえる" }),
    ).toHaveAttribute("href", "/history");
    expect(
      within(menu()).getByRole("link", { name: "ホーム" }),
    ).toHaveAttribute("href", "/");
  });
});
