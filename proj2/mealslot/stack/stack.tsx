"use client";

"use client";

import { StackProvider, StackTheme } from "@stackframe/stack";
import { client } from "./client";

export function Stack({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider app={client}>
      <StackTheme>{children}</StackTheme>
    </StackProvider>
  );
}
