import { validateName, type NameValidation } from "@/features/character/name";
import type { SaveData } from "@/features/home/save-data";

/** What pressing 「この名前にする」 leads to (AC-2, AC-3). */
export type RenamePlan =
  | {
      kind: "invalid";
      reason: Extract<NameValidation, { ok: false }>["reason"];
    }
  | { kind: "same" }
  | { kind: "confirm"; name: string };

/** Checks `input` with the naming rules and compares it with `current`. */
export function planRename(current: string, input: string): RenamePlan {
  const result = validateName(input);
  if (!result.ok) {
    return { kind: "invalid", reason: result.reason };
  }
  if (result.name === current) {
    return { kind: "same" };
  }
  return { kind: "confirm", name: result.name };
}

/** The same data with only the character's name changed (AC-6). */
export function withName(data: SaveData, name: string): SaveData {
  if (data.character === null) {
    return data;
  }
  return { ...data, character: { ...data.character, name } };
}
