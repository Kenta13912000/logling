import { InstallGuide } from "@/features/pwa/InstallGuide";

import { SettingsSection } from "./SettingsSection";

/**
 * Settings (tab-navigation AC-7): groups of items. pwa-reminder adds
 * 「ホーム画面に追加」 first; 「お知らせ」 goes above it in its next part.
 */
export function SettingsPage() {
  return (
    <main className="px-4 py-5">
      <h1 className="text-lg font-bold">設定</h1>
      <SettingsSection title="ホーム画面に追加">
        <InstallGuide />
      </SettingsSection>
    </main>
  );
}
