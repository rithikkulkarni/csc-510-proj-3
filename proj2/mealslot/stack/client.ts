// stack/client.ts
"use client";

import { StackClientApp } from "@stackframe/stack";

const hasStackEnv =
  !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
  !!process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

let client: StackClientApp<true, string>;

if (!hasStackEnv || process.env.NODE_ENV === "test") {
  // Lightweight stub for tests / missing env vars.
  // We *assert* it as StackClientApp so TypeScript is happy,
  // but at runtime it's just a minimal object.
  const stub = {
    getUser: async () => null,
    signIn: async () => null,
    signOut: async () => null,
    getToken: async () => null,
  } as unknown as StackClientApp<true, string>;

  client = stub;
} else {
  client = new StackClientApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey:
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    tokenStore: "nextjs-cookie",
    urls: {
      afterSignIn: "/auth/callback?action=login",
      afterSignUp: "/auth/callback?action=signup",
    },
  });
}

export { client };
