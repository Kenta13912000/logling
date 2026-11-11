import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

// Sign-in, the Google callback, sign-out and session checks all come here.
export function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
