// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/stack/server"; // or "../stack/server" if not using alias
import HeaderServer from "@/components/HeaderServer";
import { UserProvider } from "./context/UserContext";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "MealSlot",
  description: "Spin for meals that fit your mood",
};

const noFoucScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');           
    var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? (stored === 'dark') : prefers;
    document.documentElement.classList.toggle('dark', !!dark);

    window.__flipTheme = function() {
      var now = document.documentElement.classList.contains('dark');
      var next = !now;
      document.documentElement.classList.toggle('dark', next);
      try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
      return next;
    };
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
      </head>
      <body className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <UserProvider>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              {/* Sticky header */}
              <div className="sticky top-0 z-50">
                <HeaderServer />
              </div>

              {/* Page content */}
              <main>{children}</main>
            </StackTheme>
          </StackProvider>
        </UserProvider>
      </body>
    </html>
  );
}
