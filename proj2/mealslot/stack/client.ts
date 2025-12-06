// client.ts
let client: any = null;

// During tests or when required env vars are missing, export a lightweight stub to avoid
// initialization errors from the external Stack SDK.
if (process.env.NODE_ENV === "test" || !process.env.NEXT_PUBLIC_STACK_PROJECT_ID) {
  client = {
    getUser: async () => null,
    signIn: async () => null,
    signOut: async () => null,
    getToken: async () => null,
  };
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { StackClientApp } = require("@stackframe/stack");
  client = new StackClientApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    tokenStore: "nextjs-cookie",
    urls: {
      afterSignIn: "/auth/callback?action=login",
      afterSignUp: "/auth/callback?action=signup",
    },
  });
}

export { client };
