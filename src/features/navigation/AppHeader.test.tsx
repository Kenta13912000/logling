import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import { AppHeader } from "./AppHeader";

test("AC-8: 上の帯は「logling」だけで、リンクはない。見出しにもしない", () => {
  render(<AppHeader />);

  const bar = screen.getByRole("banner");
  expect(bar).toHaveTextContent(/^logling$/);
  expect(within(bar).queryByRole("link")).not.toBeInTheDocument();
  // Each page has its own heading; the app name is not one.
  expect(within(bar).queryByRole("heading")).not.toBeInTheDocument();
});
