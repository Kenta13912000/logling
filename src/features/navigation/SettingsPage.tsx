import { InstallGuide } from "@/features/pwa/InstallGuide";
import { ReminderSettings } from "@/features/reminder/ReminderSettings";

import { SettingsSection } from "./SettingsSection";

/**
 * Settings (tab-navigation AC-7): groups of items, as in
 * docs/aidlc/pwa-reminder/mockup.md: 「お知らせ」 above 「ホーム画面に追加」.
 */
export function SettingsPage() {
  return (
    <main className="px-4 py-5">
      <h1 className="text-lg font-bold">設定</h1>
      <SettingsSection title="お知らせ">
        <ReminderSettings />
      </SettingsSection>
      <SettingsSection title="ホーム画面に追加">
        <InstallGuide />
      </SettingsSection>
    </main>
  );
}
