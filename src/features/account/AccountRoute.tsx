"use client";

import { useSearchParams } from "next/navigation";

import { AccountPage } from "./AccountPage";

/**
 * Reads ?error=login (Better Auth adds it after a failed Google sign-in)
 * and ?withdraw=again (back from signing in again to withdraw).
 */
export function AccountRoute() {
  const params = useSearchParams();
  return (
    <AccountPage
      loginFailed={params.get("error") === "login"}
      withdrawAgain={params.get("withdraw") === "again"}
    />
  );
}
