import { render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { openedFrom, removeMatchMedia } from "@/test/match-media";

import { InstallGuide } from "./InstallGuide";

afterEach(() => {
  removeMatchMedia();
});

test("AC-4: ブラウザで開いているときは、iPhone と Android のホーム画面に追加する手順が出る", () => {
  openedFrom("browser");
  render(<InstallGuide />);

  expect(
    screen.getByText("ホーム画面に追加すると、アプリのように開けるよ"),
  ).toBeInTheDocument();
  expect(screen.getByText("iPhone（Safari）")).toBeInTheDocument();
  expect(screen.getByText("Android（Chrome）")).toBeInTheDocument();

  const [iphone, android] = screen.getAllByRole("list");
  expect(iphone).toHaveTextContent("画面の下の共有ボタン（□↑）を押す");
  expect(iphone).toHaveTextContent("「ホーム画面に追加」を選ぶ");
  expect(iphone).toHaveTextContent("右上の「追加」を押す");
  expect(android).toHaveTextContent("右上の「⋮」を押す");
  expect(android).toHaveTextContent("「ホーム画面に追加」を選ぶ");
  expect(android).toHaveTextContent("「追加」（または「インストール」）を押す");
  expect(
    screen.queryByText("✓ ホーム画面から開いているよ"),
  ).not.toBeInTheDocument();
});

test("AC-5: ホーム画面から開いているときは「✓ ホーム画面から開いているよ」だけで、手順は出ない", () => {
  openedFrom("homeScreen");
  render(<InstallGuide />);

  expect(screen.getByText("✓ ホーム画面から開いているよ")).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(screen.queryByText("iPhone（Safari）")).not.toBeInTheDocument();
});
