import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { STORAGE_KEY } from "@/features/home/save-data";
import { accountMock, cloudMock } from "@/test/mocks";

import { AccountPage } from "./AccountPage";

type Session = { user: { email: string } } | null;

const auth = vi.hoisted(() => ({
  session: null as Session,
  isPending: false,
  signInSocial: vi.fn(),
  signOut: vi.fn(),
}));

const push = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: auth.session, isPending: auth.isPending }),
    signIn: { social: auth.signInSocial },
    signOut: auth.signOut,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  auth.session = null;
  auth.isPending = false;
  auth.signInSocial.mockResolvedValue({ data: null, error: null });
  auth.signOut.mockResolvedValue({ data: { success: true }, error: null });
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ログインしていないとき", () => {
  test("AC-2: ログインすると、ほかの端末でも続きが書けることがわかる", () => {
    render(<AccountPage loginFailed={false} />);

    expect(
      screen.getByText(
        /スマホでも PC でも、同じキャラクターと日記で続きが書けるよ/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /ログインしなくても、このブラウザの中に保存して使えるよ/,
      ),
    ).toBeInTheDocument();
  });

  test("AC-3: 「Google でログイン」を押すと、戻り先と失敗したときの戻り先を付けて Google のログインが始まる", async () => {
    const user = userEvent.setup();
    render(<AccountPage loginFailed={false} />);

    await user.click(screen.getByRole("button", { name: "Google でログイン" }));

    expect(auth.signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/account?error=login",
    });
  });

  test("AC-5: ログインに失敗して戻ってきたときは、ログインできなかったことと、ブラウザの日記が残っていることがわかる", () => {
    const saved = JSON.stringify({ version: 1, character: null, entries: [] });
    localStorage.setItem(STORAGE_KEY, saved);

    render(<AccountPage loginFailed />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "ログインできなかった…もう一度ためしてね。このブラウザの日記はそのまま残っているよ",
    );
    expect(
      screen.getByRole("button", { name: "Google でログイン" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  test("AC-5: ふつうに開いたときは、失敗のお知らせを出さない", () => {
    render(<AccountPage loginFailed={false} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("AC-2: ログインしているかを調べている間は、ログインのボタンもログアウトのボタンも出さない", () => {
    auth.isPending = true;
    render(<AccountPage loginFailed={false} />);

    expect(
      screen.queryByRole("button", { name: "Google でログイン" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログアウト" }),
    ).not.toBeInTheDocument();
  });
});

describe("ログイン中", () => {
  beforeEach(() => {
    auth.session = { user: { email: "you@example.com" } };
  });

  test("AC-4, AC-22: 日記がクラウドに保存されていることと、ログアウトすると端末に残らないことがわかる", () => {
    render(<AccountPage loginFailed={false} />);

    expect(
      screen.getByText(/日記はインターネット上の保管場所にしまわれているよ/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "ログアウトすると、この端末には日記もキャラクターも残らないよ",
      ),
    ).toBeInTheDocument();
  });

  test("AC-4: ログインしていることと、メールアドレスがわかる", () => {
    render(<AccountPage loginFailed={false} />);

    expect(screen.getByText("ログイン中")).toBeInTheDocument();
    expect(screen.getByText("you@example.com")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Google でログイン" }),
    ).not.toBeInTheDocument();
  });

  test("AC-22: 「ログアウト」を押すとログアウトして、ホームに戻る", async () => {
    const user = userEvent.setup();
    render(<AccountPage loginFailed={false} />);

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(auth.signOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });
});

describe("通信に失敗したとき", () => {
  test("AC-5: Google でのログインを始められなかったときも、ログインできなかったことがわかる", async () => {
    auth.signInSocial.mockResolvedValue({
      data: null,
      error: { status: 500, message: "failed" },
    });
    const user = userEvent.setup();
    render(<AccountPage loginFailed={false} />);

    await user.click(screen.getByRole("button", { name: "Google でログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ログインできなかった",
    );
  });

  test("AC-22: ログアウトに失敗したときは、ホームに戻らず、ログアウトできなかったことがわかる", async () => {
    auth.session = { user: { email: "you@example.com" } };
    auth.signOut.mockResolvedValue({
      data: null,
      error: { status: 500, message: "failed" },
    });
    const user = userEvent.setup();
    render(<AccountPage loginFailed={false} />);

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ログアウトできなかった",
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("退会", () => {
  const piyo = {
    version: 1 as const,
    character: { name: "ぴよ", totalExp: 0 },
    entries: [],
  };

  beforeEach(() => {
    auth.session = { user: { email: "you@example.com" } };
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: piyo });
  });

  async function openWithdraw() {
    const user = userEvent.setup();
    render(<AccountPage loginFailed={false} />);
    await user.click(await screen.findByRole("button", { name: "退会する" }));
    return { user, dialog: screen.getByRole("dialog", { name: "退会する？" }) };
  }

  test("AC-25: ログイン中は「退会する」があり、押すと、そのアカウントのキャラクターと日記が消えることの確認が出る", async () => {
    const { dialog } = await openWithdraw();

    expect(dialog).toHaveTextContent(
      "ぴよ（Lv. 1）と日記 0 件が、すべて消えるよ。",
    );
  });

  test("AC-26: 確認で退会すると、退会してログインの記録を消し、ホームに戻る", async () => {
    accountMock.withdrawAccount.mockResolvedValue({ ok: true });
    const { user, dialog } = await openWithdraw();

    await user.click(within(dialog).getByRole("button", { name: "退会する" }));

    expect(accountMock.withdrawAccount).toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  test("AC-28: 確認でやめると、何もしない", async () => {
    const { user, dialog } = await openWithdraw();

    await user.click(within(dialog).getByRole("button", { name: "やめる" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(accountMock.withdrawAccount).not.toHaveBeenCalled();
  });

  test("AC-28: 退会できなかったときは、そのことがわかり、ホームに戻らない", async () => {
    accountMock.withdrawAccount.mockResolvedValue({
      ok: false,
      reason: "failed",
    });
    const { user, dialog } = await openWithdraw();

    await user.click(within(dialog).getByRole("button", { name: "退会する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "退会できなかった…通信できるところで、もう一度ためしてね",
    );
    expect(push).not.toHaveBeenCalled();
  });

  test("AC-25: ログインして 1 日より前のときは、もう一度ログインするように出て、ログインし直すとアカウントの画面に戻る", async () => {
    accountMock.withdrawAccount.mockResolvedValue({
      ok: false,
      reason: "reauth",
    });
    const { user, dialog } = await openWithdraw();

    await user.click(within(dialog).getByRole("button", { name: "退会する" }));
    expect(
      await screen.findByText("本人の確認のため、もう一度ログインしてね"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Google でログインし直す" }),
    );

    expect(auth.signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/account?withdraw=again",
      errorCallbackURL: "/account?error=login",
    });
  });

  test("AC-25: ログインし直して戻ってきたときは、退会の確認がまた出る", async () => {
    render(<AccountPage loginFailed={false} withdrawAgain />);

    expect(
      await screen.findByRole("dialog", { name: "退会する？" }),
    ).toBeInTheDocument();
  });
});

describe("説明ページへの入口", () => {
  test("AC-7, AC-31: ログインしていないときも、ログイン中も、「日記の保存のしかた」へ行ける", () => {
    const { unmount } = render(<AccountPage loginFailed={false} />);
    expect(
      screen.getByRole("link", { name: /日記の保存のしかた/ }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByText(
        /日記はインターネット上の保管場所にしまわれ、あなたしか読めない/,
      ),
    ).toBeInTheDocument();
    unmount();

    auth.session = { user: { email: "you@example.com" } };
    render(<AccountPage loginFailed={false} />);
    expect(
      screen.getByRole("link", { name: /日記の保存のしかた/ }),
    ).toHaveAttribute("href", "/privacy");
  });
});

// tab-navigation: the way back home moved to the tabs (TabBar.test).
describe("上の帯", () => {
  test("tab-navigation AC-8: アカウントの画面に、上の帯と「‹ ホーム」のリンクはない", () => {
    render(<AccountPage loginFailed={false} />);

    expect(
      screen.queryByRole("link", { name: /ホーム/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});
