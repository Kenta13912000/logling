"use server";

/** Whether this person has comments on (AC-1 to AC-4). */
export type CompanionSettingResult =
  | { ok: true; enabled: boolean }
  | { ok: false; reason: "unauthorized" | "invalid" | "failed" };

export async function getCompanionSetting(): Promise<CompanionSettingResult> {
  // Bolt-1 ⑥: placeholder until ⑦ fills it in.
  return { ok: false, reason: "failed" };
}

export async function setCompanionEnabled(
  enabled: boolean,
): Promise<CompanionSettingResult> {
  // Bolt-1 ⑥: placeholder until ⑦ fills it in.
  void enabled;
  return { ok: false, reason: "failed" };
}
