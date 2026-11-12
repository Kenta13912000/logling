import type { Metadata } from "next";

import { SettingsPage } from "@/features/navigation/SettingsPage";

export const metadata: Metadata = {
  title: "設定 | logling",
};

export default function Page() {
  return <SettingsPage />;
}
