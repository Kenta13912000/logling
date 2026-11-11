import { createAuthClient } from "better-auth/react";

/** Better Auth in the browser. Talks to /api/auth on the same origin. */
export const authClient = createAuthClient();
