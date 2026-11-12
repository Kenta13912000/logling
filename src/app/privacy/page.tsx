import type { Metadata } from "next";

import { PrivacyPage } from "@/features/privacy/PrivacyPage";

export const metadata: Metadata = {
  title: "日記の保存のしかた | logling",
};

export default function Page() {
  return <PrivacyPage />;
}
