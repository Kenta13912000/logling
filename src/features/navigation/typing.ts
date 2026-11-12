import { useEffect, useState } from "react";

/** <input> types that are pressed or picked rather than typed into. */
const NOT_TYPED = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Whether the focused element is a field for typing text (AC-9). */
export function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return !NOT_TYPED.has(target.type);
  }
  return false;
}

/**
 * True while a field for typing text is focused (AC-9). Moving from one
 * field to another stays true: focusout already names the next field.
 *
 * Leaving a field by pressing a button moves focus as the press starts. If
 * the tabs came back right then, they could cover the button before the
 * press ends, and the button would never be clicked. So while a press is
 * in progress, the tabs come back only after it ends.
 */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let pressing = false;
    let showAfterPress = false;

    const stopTyping = () => {
      if (pressing) {
        showAfterPress = true;
      } else {
        setTyping(false);
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (isTextEntry(event.target)) {
        showAfterPress = false;
        setTyping(true);
      } else {
        stopTyping();
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!isTextEntry(event.relatedTarget)) {
        stopTyping();
      }
    };
    const onPointerDown = () => {
      pressing = true;
    };
    const onPointerUp = () => {
      pressing = false;
      if (showAfterPress) {
        showAfterPress = false;
        // After the click that this press makes.
        setTimeout(() => setTyping(isTextEntry(document.activeElement)), 0);
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, []);

  return typing;
}
