"use client";

import { useSearchParams } from "next/navigation";

import { AccountPage } from "./AccountPage";

/** Reads ?error=login, which Better Auth adds after a failed Google sign-in. */
export function AccountRoute() {
  const params = useSearchParams();
  return <AccountPage loginFailed={params.get("error") === "login"} />;
}
