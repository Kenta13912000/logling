import "@testing-library/jest-dom/vitest";

// jsdom does not implement <dialog> methods. Mimic just the open state;
// focus handling is covered by the Playwright tests in a real browser.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
