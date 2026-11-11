import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountRoute } from "@/features/account/AccountRoute";

export const metadata: Metadata = {
  title: "アカウント | logling",
};

export default function Page() {
  // Reading the URL query must happen inside Suspense (Cache Components).
  return (
    <Suspense fallback={null}>
      <AccountRoute />
    </Suspense>
  );
}
