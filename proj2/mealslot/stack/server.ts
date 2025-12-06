// stack/server.ts
import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  // You can add urls here if you want custom redirects, e.g.:
  // urls: {
  //   afterSignIn: "/",
  //   afterSignUp: "/",
  // },
});