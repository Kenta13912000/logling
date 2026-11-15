import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import type { SaveData } from "@/features/home/save-data";
import { authMock, cloudMock, companionMock, signInAs } from "@/test/mocks";

import { CompanionSettings } from "./CompanionSettings";

const toggle = () => screen.getByRole("switch", { name: "日記へのコメント" });
const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const LOAD_ERROR = "⚠ 読み込めなかった…通信できるところで、開き直してね";

const chibi: SaveData = {
  version: 1,
  character: { name: "ちびすけ", totalExp: 0, startDate: "2026-11-01" },
  entries: [],
};

beforeEach(() => {
  signInAs("you@example.com");
  cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: chibi });
  companionMock.getCompanionSetting.mockResolvedValue({
    ok: true,
    enabled: false,
  });
  companionMock.setCompanionEnabled.mockImplementation(async (enabled) => ({
    ok: true,
    enabled,
  }));
});

describe("使えないとき", () => {
  test("AC-1: ログインしていないときは押せず、「ログインすると使えるよ」とログインへのリンクが出る", async () => {
    authMock.session = null;
    render(<CompanionSettings />);

    expect(
      await screen.findByText(/ログインすると使えるよ/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ログインする/ })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(toggle()).toBeDisabled();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(companionMock.getCompanionSetting).not.toHaveBeenCalled();
  });

  test("AC-1: ログインしているかを調べている間は押せない", () => {
    authMock.isPending = true;
    render(<CompanionSettings />);

    expect(toggle()).toBeDisabled();
  });

  test("AC-4: オン・オフを読んでいる間は押せない。読めなかったら押せず、「読み込めなかった」が出る", async () => {
    let finish: (value: { ok: false; reason: "failed" }) => void = () => {};
    companionMock.getCompanionSetting.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<CompanionSettings />);
    expect(toggle()).toBeDisabled();

    finish({ ok: false, reason: "failed" });

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(toggle()).toBeDisabled();
  });
});

describe("ログイン中", () => {
  test("AC-1: はじめはオフで、説明に今のキャラクターの名前が入る", async () => {
    render(<CompanionSettings />);

    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(
      await screen.findByText("日記を書くと、ちびすけがひとことコメントするよ"),
    ).toBeInTheDocument();
  });

  test("AC-1: キャラクターがまだいないときは、説明の名前は「キャラクター」", async () => {
    cloudMock.loadCloudData.mockResolvedValue({
      ok: true,
      data: { version: 1, character: null, entries: [] },
    });
    render(<CompanionSettings />);

    expect(
      await screen.findByText(
        "日記を書くと、キャラクターがひとことコメントするよ",
      ),
    ).toBeInTheDocument();
  });

  test("AC-2: オフで押すと確認の窓が出て、「やめる」では保存せずオフのまま", async () => {
    const user = userEvent.setup();
    render(<CompanionSettings />);
    await waitFor(() => expect(toggle()).toBeEnabled());

    await user.click(toggle());
    const dialog = screen.getByRole("dialog", {
      name: "コメントをオンにする？",
    });
    expect(dialog).toHaveTextContent("ちびすけのコメントを作るよ");
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(
      screen.queryByRole("dialog", { name: "コメントをオンにする？" }),
    ).not.toBeInTheDocument();
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(companionMock.setCompanionEnabled).not.toHaveBeenCalled();
  });

  test("AC-2: 確認の窓の「オンにする」で保存して、オンになる", async () => {
    const user = userEvent.setup();
    render(<CompanionSettings />);
    await waitFor(() => expect(toggle()).toBeEnabled());

    await user.click(toggle());
    await user.click(screen.getByRole("button", { name: "オンにする" }));

    expect(companionMock.setCompanionEnabled).toHaveBeenCalledWith(true);
    await waitFor(() =>
      expect(toggle()).toHaveAttribute("aria-checked", "true"),
    );
    expect(
      screen.queryByRole("dialog", { name: "コメントをオンにする？" }),
    ).not.toBeInTheDocument();
  });

  test("AC-3: オンで押すと、確認なしで保存してオフになる", async () => {
    const user = userEvent.setup();
    companionMock.getCompanionSetting.mockResolvedValue({
      ok: true,
      enabled: true,
    });
    render(<CompanionSettings />);
    await waitFor(() =>
      expect(toggle()).toHaveAttribute("aria-checked", "true"),
    );

    await user.click(toggle());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(companionMock.setCompanionEnabled).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(toggle()).toHaveAttribute("aria-checked", "false"),
    );
  });

  test("AC-4: 保存している間は押せない", async () => {
    const user = userEvent.setup();
    companionMock.setCompanionEnabled.mockReturnValue(new Promise(() => {}));
    render(<CompanionSettings />);
    await waitFor(() => expect(toggle()).toBeEnabled());

    await user.click(toggle());
    await user.click(screen.getByRole("button", { name: "オンにする" }));

    expect(toggle()).toBeDisabled();
  });

  test("AC-4: 保存に失敗したら前の状態に戻り、「保存できなかった」が出る", async () => {
    const user = userEvent.setup();
    companionMock.setCompanionEnabled.mockResolvedValue({
      ok: false,
      reason: "failed",
    });
    render(<CompanionSettings />);
    await waitFor(() => expect(toggle()).toBeEnabled());

    await user.click(toggle());
    await user.click(screen.getByRole("button", { name: "オンにする" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(toggle()).toHaveAttribute("aria-checked", "false");
    expect(toggle()).toBeEnabled();
  });
});
