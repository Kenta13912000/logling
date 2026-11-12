import type { Metadata } from "next";

import { MorePage } from "@/features/navigation/MorePage";

export const metadata: Metadata = {
  title: "その他 | logling",
};

export default function Page() {
  return <MorePage />;
}
