import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { STORAGE_KEY, type SaveData } from "@/features/home/save-data";
import { cloudMock, signInAs } from "@/test/mocks";

import { CharacterSettings } from "./CharacterSettings";

const SAVE_ERROR = "⚠ 保存できなかった…通信できるところで、もう一度ためしてね";
const GONE =
  "⚠ ほかの端末で、キャラクターがなくなっていたよ。最新の内容を表示したよ";

const piyo: SaveData = {
  version: 1,
  character: { name: "ぴよ", totalExp: 120, startDate: "2026-11-01" },
  entries: [
    {
      date: "2026-11-06",
      body: "きのうの日記",
      createdAt: "2026-11-06T12:00:00.000Z",
    },
  ],
};

const renamed: SaveData = {
  ...piyo,
  character: { ...piyo.character!, name: "ちびすけ" },
};

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

function seed(data: SaveData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const changeButton = () => screen.getByRole("button", { name: "名前を変える" });
const input = () => screen.getByLabelText("新しい名前（10 文字まで）");

/** Opens the input and types `name` in place of the current name. */
async function typeName(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(changeButton());
  await user.clear(input());
  if (name !== "") {
    await user.type(input(), name);
  }
  await user.click(screen.getByRole("button", { name: "この名前にする" }));
}

beforeEach(() => {
  localStorage.clear();
});

describe("ふだんの表示", () => {
  test("AC-1: 今の名前と「名前を変える」ボタンが出る", () => {
    seed(piyo);
    render(<CharacterSettings />);

    expect(screen.getByText("名前")).toBeInTheDocument();
    expect(screen.getByText("ぴよ")).toBeInTheDocument();
    expect(changeButton()).toBeEnabled();
  });

  test("AC-4: 名前を付ける前は「まだ名前がないよ」と、ホームへのリンクが出る", () => {
    render(<CharacterSettings />);

    expect(screen.getByText(/まだ名前がないよ。/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ホームで名前を付けてね/ }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByRole("button", { name: "名前を変える" }),
    ).not.toBeInTheDocument();
  });

  test("AC-1: ブラウザの中のデータがこわれているときは、名前を変えずにホームへ案内する", () => {
    localStorage.setItem(STORAGE_KEY, "{");
    render(<CharacterSettings />);

    expect(
      screen.getByRole("link", { name: /ホームで直してね/ }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByRole("button", { name: "名前を変える" }),
    ).not.toBeInTheDocument();
  });
});

describe("名前を変える流れ（ログインしていないとき）", () => {
  test("AC-2: 「名前を変える」で、今の名前が入った入力欄が出て、そこにフォーカスが移る", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await user.click(changeButton());

    expect(input()).toHaveValue("ぴよ");
    expect(input()).toHaveFocus();
  });

  test("AC-2, AC-6: 「この名前にする」→ 確認 →「変える」で、名前だけが変わってブラウザの中に保存される", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await typeName(user, "ちびすけ");
    const question = screen.getByText("「ちびすけ」に変える？");
    expect(question).toHaveFocus();
    expect(
      screen.getByText("経験値やレベル、日記はそのままだよ"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByText("ちびすけ")).toBeInTheDocument();
    expect(changeButton()).toHaveFocus();
    expect(stored()).toStrictEqual(renamed);
    expect(cloudMock.renameCloudCharacter).not.toHaveBeenCalled();
  });

  test("AC-2: 確認の「やめる」で、入れた名前のまま入力欄に戻る", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(input()).toHaveValue("ちびすけ");
    expect(input()).toHaveFocus();
    expect(stored()).toStrictEqual(piyo);
  });

  test("AC-2: 入力欄の「やめる」で、何も変えずに閉じる", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await user.click(changeButton());
    await user.clear(input());
    await user.type(input(), "ちびすけ");
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(screen.getByText("ぴよ")).toBeInTheDocument();
    expect(changeButton()).toHaveFocus();
    expect(stored()).toStrictEqual(piyo);
  });

  test("AC-3: 空のときは「名前を入れてね」、11 文字以上は「名前は 10 文字までにしてね」で止まり、保存しない", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await typeName(user, "");
    expect(screen.getByRole("alert")).toHaveTextContent("⚠ 名前を入れてね");
    expect(input()).toHaveAttribute("aria-invalid", "true");

    await user.type(input(), "あ".repeat(11));
    await user.click(screen.getByRole("button", { name: "この名前にする" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "⚠ 名前は 10 文字までにしてね",
    );
    expect(screen.queryByText(/に変える？/)).not.toBeInTheDocument();
    expect(stored()).toStrictEqual(piyo);
  });

  test("AC-3: 前後の空白は除いて確認に出す", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await typeName(user, "  ちびすけ ");

    expect(screen.getByText("「ちびすけ」に変える？")).toBeInTheDocument();
  });

  test("AC-3: 今と同じ名前のときは、確認を出さず、保存もせずに閉じる", async () => {
    const user = userEvent.setup();
    seed(piyo);
    const before = localStorage.getItem(STORAGE_KEY);
    render(<CharacterSettings />);

    await typeName(user, " ぴよ ");

    expect(screen.queryByText(/に変える？/)).not.toBeInTheDocument();
    expect(screen.getByText("ぴよ")).toBeInTheDocument();
    expect(changeButton()).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  test("AC-2: 何度でも変えられる", async () => {
    const user = userEvent.setup();
    seed(piyo);
    render(<CharacterSettings />);

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));
    await screen.findByText("ちびすけ");
    await typeName(user, "たま");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByText("たま")).toBeInTheDocument();
    expect(stored().character.name).toBe("たま");
  });
});

describe("ログイン中", () => {
  beforeEach(() => {
    signInAs("you@example.com");
    cloudMock.loadCloudData.mockResolvedValue({ ok: true, data: piyo });
  });

  test("AC-1: 読み込んでいる間は「読み込んでいるよ…」", () => {
    cloudMock.loadCloudData.mockReturnValue(new Promise(() => {}));
    render(<CharacterSettings />);

    expect(screen.getByText("読み込んでいるよ…")).toBeInTheDocument();
  });

  test("AC-1: 読み込めなかったときは「もう一度読み込む」で読み直せる", async () => {
    const user = userEvent.setup();
    cloudMock.loadCloudData.mockRejectedValueOnce(
      new TypeError("fetch failed"),
    );
    render(<CharacterSettings />);

    expect(
      await screen.findByText("データを読み込めなかった…"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "もう一度読み込む" }));

    expect(await screen.findByText("ぴよ")).toBeInTheDocument();
  });

  test("AC-8: 「変える」で保管場所に新しい名前を送り、返ってきた名前が出る。ブラウザの中には書かない", async () => {
    const user = userEvent.setup();
    cloudMock.renameCloudCharacter.mockResolvedValue({
      ok: true,
      data: renamed,
    });
    render(<CharacterSettings />);
    await screen.findByText("ぴよ");

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByText("ちびすけ")).toBeInTheDocument();
    expect(cloudMock.renameCloudCharacter).toHaveBeenCalledWith("ちびすけ");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("AC-9: 保存している間は「保存しているよ…」になり、「変える」も「やめる」も押せない", async () => {
    const user = userEvent.setup();
    cloudMock.renameCloudCharacter.mockReturnValue(new Promise(() => {}));
    render(<CharacterSettings />);
    await screen.findByText("ぴよ");

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(
      screen.getByRole("button", { name: "保存しているよ…" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "やめる" })).toBeDisabled();
  });

  test("AC-9: 保存に失敗したときは前の名前のままで、「保存できなかった」が出る。もう一度「名前を変える」を押すと消える", async () => {
    const user = userEvent.setup();
    cloudMock.renameCloudCharacter.mockResolvedValue({
      ok: false,
      reason: "failed",
    });
    render(<CharacterSettings />);
    await screen.findByText("ぴよ");

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(screen.getByText("ぴよ")).toBeInTheDocument();
    await user.click(changeButton());
    expect(screen.queryByText(SAVE_ERROR)).not.toBeInTheDocument();
  });

  test("AC-9: 通信そのものに失敗したときも、前の名前のままで「保存できなかった」が出る", async () => {
    const user = userEvent.setup();
    cloudMock.renameCloudCharacter.mockRejectedValue(
      new TypeError("fetch failed"),
    );
    render(<CharacterSettings />);
    await screen.findByText("ぴよ");

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(SAVE_ERROR);
    expect(screen.getByText("ぴよ")).toBeInTheDocument();
  });

  test("AC-10: ほかの端末でキャラクターがなくなっていたときは、名前を変えずに最新の内容に切りかえ、そのことが出る", async () => {
    const user = userEvent.setup();
    cloudMock.renameCloudCharacter.mockResolvedValue({
      ok: false,
      reason: "noCharacter",
      data: { version: 1, character: null, entries: [] },
    });
    render(<CharacterSettings />);
    await screen.findByText("ぴよ");

    await typeName(user, "ちびすけ");
    await user.click(screen.getByRole("button", { name: "変える" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(GONE);
    expect(screen.getByText(/まだ名前がないよ。/)).toBeInTheDocument();
    expect(screen.queryByText("ちびすけ")).not.toBeInTheDocument();
  });
});
