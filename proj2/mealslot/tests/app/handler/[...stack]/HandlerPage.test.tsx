// tests/app/handler/[...stack]/HandlerPage.test.tsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// ----------------------
// Mocks (hoist-safe)
// ----------------------

// Mock @stackframe/stack and capture props passed to StackHandler
vi.mock("@stackframe/stack", () => {
  const store = {
    lastProps: [] as any[],
  };

  const StackHandler = (props: any) => {
    store.lastProps.push(props);
    return <div data-testid="stack-handler" />;
  };

  // Minimal mock class so stack/server.ts can do `new StackServerApp(...)`
  class StackServerApp {
    config: any;
    constructor(config: any) {
      this.config = config;
    }
  }

  return {
    StackHandler,
    StackServerApp,
    __mocks: store,
  };
});

// ----------------------
// Imports AFTER mocks
// ----------------------
import * as StackModule from "@stackframe/stack";
import { stackServerApp } from "../../../../stack/server";
import Handler from "../../../../app/handler/[...stack]/page";

const stackMocks = (StackModule as any).__mocks;

describe("Handler page", () => {
  it("renders StackHandler with fullPage, stackServerApp, and routeProps", () => {
    const routeProps = { params: { stack: ["some", "route"] } };

    render(<Handler {...(routeProps as any)} />);

    // Our mock StackHandler rendered
    expect(screen.getByTestId("stack-handler")).toBeInTheDocument();

    // Props passed to StackHandler
    expect(stackMocks.lastProps.length).toBe(1);
    const props = stackMocks.lastProps[0];

    expect(props.fullPage).toBe(true);
    expect(props.app).toBe(stackServerApp);
    expect(props.routeProps).toMatchObject(routeProps);
  });
});
