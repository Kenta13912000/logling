import { InstallGuide } from "@/features/pwa/InstallGuide";
import { ReminderSettings } from "@/features/reminder/ReminderSettings";
import { CharacterSettings } from "@/features/rename/CharacterSettings";

import { SettingsSection } from "./SettingsSection";

/**
 * Settings (tab-navigation AC-7): groups of items. 「キャラクター」 comes
 * first (settings AC-1), then 「お知らせ」 and 「ホーム画面に追加」
 * (docs/aidlc/pwa-reminder/mockup.md).
 */
export function SettingsPage() {
  return (
    <main className="px-4 py-5">
      <h1 className="text-lg font-bold">設定</h1>
      <SettingsSection title="キャラクター">
        <CharacterSettings />
      </SettingsSection>
      <SettingsSection title="お知らせ">
        <ReminderSettings />
      </SettingsSection>
      <SettingsSection title="ホーム画面に追加">
        <InstallGuide />
      </SettingsSection>
    </main>
  );
}
