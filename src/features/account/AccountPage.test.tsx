import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { STORAGE_KEY } from "@/features/home/save-data";

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

describe("上の帯", () => {
  test("AC-2: アカウントの画面からホームに戻れる", () => {
    render(<AccountPage loginFailed={false} />);

    expect(screen.getByRole("link", { name: /ホーム/ })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
