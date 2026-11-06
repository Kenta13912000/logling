import type { Metadata } from "next";

import { HistoryPage } from "@/features/history/HistoryPage";

export const metadata: Metadata = {
  title: "ふりかえり | logling",
};

export default function Page() {
  return <HistoryPage />;
}
