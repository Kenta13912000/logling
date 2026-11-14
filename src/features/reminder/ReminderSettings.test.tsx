import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { openedFrom, removeMatchMedia } from "@/test/match-media";
import { authMock, signInAs } from "@/test/mocks";

import { ReminderSettings } from "./ReminderSettings";

// The browser's push machinery is replaced; push-client.test covers it.
const client = vi.hoisted(() => ({
  pushSupported: vi.fn(),
  notificationPermission: vi.fn(),
  loadReminder: vi.fn(),
  turnOn: vi.fn(),
  changeTime: vi.fn(),
  turnOff: vi.fn(),
}));
vi.mock("./push-client", () => client);

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";

const toggle = () => screen.getByRole("switch", { name: "書き忘れのお知らせ" });
const time = () => screen.getByRole("combobox", { name: "時刻" });
const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const ONLY_HERE = "この端末にだけ届くよ。15 分ほど遅れることがあるよ";

beforeEach(() => {
  openedFrom("browser");
  signInAs("you@example.com");
  client.pushSupported.mockReturnValue(true);
  client.notificationPermission.mockReturnValue("default");
  client.loadReminder.mockResolvedValue({ ok: true, minute: null });
  client.turnOn.mockResolvedValue({ ok: true, minute: 1260 });
  client.changeTime.mockResolvedValue({ ok: true, minute: 1290 });
  client.turnOff.mockResolvedValue({ ok: true, minute: null });
});

afterEach(() => {
  removeMatchMedia();
  Reflect.deleteProperty(navigator, "userAgent");
  vi.resetAllMocks();
});

describe("使えないとき（AC-9）", () => {
  test("AC-9: ログインしていないときは「ログインすると使えるよ」と、アカウントの画面へのリンクが出て、切り替えは押せない", async () => {
    authMock.session = null;
    render(<ReminderSettings />);

    expect(
      await screen.findByText(/ログインすると使えるよ/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ログインする/ })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(toggle()).toBeDisabled();
    expect(client.loadReminder).not.toHaveBeenCalled();
  });

  test("AC-9: ログインしているかを確かめている間は、切り替えは押せない", () => {
    authMock.isPending = true;
    render(<ReminderSettings />);

    expect(toggle()).toBeDisabled();
  });

  test("AC-9: 許可を断っているときは、端末の設定で許可する方法が出て、切り替えは押せない", async () => {
    client.notificationPermission.mockReturnValue("denied");
    render(<ReminderSettings />);

    expect(
      await screen.findByText(
        "お知らせが許可されていないよ。端末の設定で、logling のお知らせを許可してね",
      ),
    ).toBeInTheDocument();
    expect(toggle()).toBeDisabled();
  });

  test("AC-9: iPhone のブラウザで開いているときは、ホーム画面に追加すると使えることが出る", async () => {
    client.pushSupported.mockReturnValue(false);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: IPHONE_SAFARI,
    });
    render(<ReminderSettings />);

    expect(
      await screen.findByText(
        "iPhone では、ホーム画面に追加して、そこから開くと使えるよ（追加のしかたは下にあるよ）",
      ),
    ).toBeInTheDocument();
    expect(toggle()).toBeDisabled();
  });

  test("AC-9: しくみのないブラウザでは「このブラウザでは、お知らせを使えないよ」", async () => {
    client.pushSupported.mockReturnValue(false);
    render(<ReminderSettings />);

    expect(
      await screen.findByText("このブラウザでは、お知らせを使えないよ"),
    ).toBeInTheDocument();
    expect(toggle()).toBeDisabled();
  });
});

describe("使えるとき", () => {
  test("AC-6: はじめはオフで、時刻は出ない", async () => {
    render(<ReminderSettings />);

    expect(
      await screen.findByText(/まだ日記を書いていない日に/),
    ).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(toggle()).toBeEnabled();
    expect(screen.queryByRole("combobox", { name: "時刻" })).toBeNull();
  });

  test("AC-6, AC-7: この端末がオンなら、その時刻と「この端末にだけ届くよ」が出る", async () => {
    client.loadReminder.mockResolvedValue({ ok: true, minute: 1290 });
    render(<ReminderSettings />);

    expect(await screen.findByText(ONLY_HERE)).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(time()).toHaveValue("1290");
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent(
      "21:30",
    );
    expect(screen.getAllByRole("option")).toHaveLength(48);
  });

  test("AC-6, AC-7: オンにすると 21:00 で保存され、時刻が出る", async () => {
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(/まだ日記を書いていない日に/);

    await user.click(toggle());

    expect(client.turnOn).toHaveBeenCalledWith(1260);
    expect(toggle()).toHaveAttribute("aria-checked", "true");
    expect(time()).toHaveValue("1260");
  });

  test("AC-9: オンにしようとして許可を断ったら、オフのまま、許可されていないことが出る", async () => {
    client.turnOn.mockResolvedValue({ ok: false, reason: "denied" });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(/まだ日記を書いていない日に/);

    await user.click(toggle());

    expect(
      await screen.findByText(/お知らせが許可されていないよ/),
    ).toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  test("AC-10: オンにするのに失敗したら、オフのまま、保存できなかったことがわかる", async () => {
    client.turnOn.mockResolvedValue({ ok: false, reason: "failed" });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(/まだ日記を書いていない日に/);

    await user.click(toggle());

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(toggle()).toHaveAttribute("aria-checked", "false");
  });

  test("AC-10: 保存している間は、切り替えを押せない", async () => {
    client.turnOn.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(/まだ日記を書いていない日に/);

    await user.click(toggle());

    expect(toggle()).toBeDisabled();
  });

  test("AC-7: 時刻を変えると保存される", async () => {
    client.loadReminder.mockResolvedValue({ ok: true, minute: 1260 });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(ONLY_HERE);

    await user.selectOptions(time(), "1290");

    expect(client.changeTime).toHaveBeenCalledWith(1290);
    expect(time()).toHaveValue("1290");
  });

  test("AC-10: 時刻の保存に失敗したら、前の時刻に戻り、保存できなかったことがわかる", async () => {
    client.loadReminder.mockResolvedValue({ ok: true, minute: 1260 });
    client.changeTime.mockResolvedValue({ ok: false, reason: "failed" });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(ONLY_HERE);

    await user.selectOptions(time(), "1290");

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(time()).toHaveValue("1260");
  });

  test("AC-15: オフにすると、時刻が消える", async () => {
    client.loadReminder.mockResolvedValue({ ok: true, minute: 1260 });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(ONLY_HERE);

    await user.click(toggle());

    expect(client.turnOff).toHaveBeenCalled();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("combobox", { name: "時刻" })).toBeNull();
  });

  test("AC-10: オフにするのに失敗したら、オンのまま、保存できなかったことがわかる", async () => {
    client.loadReminder.mockResolvedValue({ ok: true, minute: 1260 });
    client.turnOff.mockResolvedValue({ ok: false, reason: "failed" });
    const user = userEvent.setup();
    render(<ReminderSettings />);
    await screen.findByText(ONLY_HERE);

    await user.click(toggle());

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(toggle()).toHaveAttribute("aria-checked", "true");
  });
});
