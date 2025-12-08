/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import PartyClient from "../../components/PartyClient";

// ---- Realtime mock wiring ---------------------------------------------------

type Handler = (payload: any) => void;

const rtHandlers: Record<string, Handler[]> = {};
const emitSpy = vi.fn();

vi.mock("@/lib/realtime", () => {
  return {
    getRealtimeForRoom: vi.fn(async (code: string) => {
      return {
        kind: "mock-socket",
        emit: (event: string, payload: any) => {
          emitSpy(event, payload);
          (rtHandlers[event] ?? []).forEach((h) => h(payload));
        },
        on: (event: string, handler: Handler) => {
          if (!rtHandlers[event]) rtHandlers[event] = [];
          rtHandlers[event].push(handler);
        },
        close: vi.fn(),
      };
    }),
  };
});

// ---- UserContext mock -------------------------------------------------------

vi.mock("@/app/context/UserContext", () => {
  return {
    useUser: () => ({
      user: {
        id: "user-1",
        displayName: "User One",
        allergens: ["Peanuts"],
      },
    }),
  };
});

// ---- Child component stubs --------------------------------------------------

const spinStore: { lastProps: any | null } = { lastProps: null };
const sidebarStore: { lastProps: any | null } = { lastProps: null };
const chatStore: { lastProps: any | null } = { lastProps: null };

vi.mock("@/components/party/PartySpinMachine", () => ({
  __esModule: true,
  default: (props: any) => {
    spinStore.lastProps = props;
    return (
      <div data-testid="party-spin-machine">
        <button
          type="button"
          onClick={() => props.onGroupSpin && props.onGroupSpin()}
        >
          spin
        </button>
        <button
          type="button"
          onClick={() =>
            props.onCategoryChange && props.onCategoryChange(0, "Lunch")
          }
        >
          change-cat-0
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/party/PartySidebar", () => ({
  __esModule: true,
  default: (props: any) => {
    sidebarStore.lastProps = props;
    return <div data-testid="party-sidebar">sidebar</div>;
  },
}));

vi.mock("@/components/party/PartyChat", () => ({
  __esModule: true,
  default: (props: any) => {
    chatStore.lastProps = props;
    return (
      <div data-testid="party-chat">
        <button
          type="button"
          onClick={() => props.onSendChat && props.onSendChat("hello from chat")}
        >
          send-chat
        </button>
      </div>
    );
  },
}));

// ---- Helpers ----------------------------------------------------------------

const buildStateResponse = (code: string) => ({
  party: {
    id: "party-1",
    code,
    isActive: true,
    constraints: {
      diet: "vegetarian",
      allergens: ["Peanuts"],
    },
  },
  members: [
    {
      id: "member-1",
      nickname: "Host",
      prefs: {
        diet: "vegetarian",
        allergens: ["Peanuts"],
      },
    },
  ],
});

// Crypto polyfill for randomUUID used in PartyClient
const originalCrypto = globalThis.crypto as Crypto | undefined;

// ---- Test suite -------------------------------------------------------------

describe("PartyClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // fresh handlers for each test
    Object.keys(rtHandlers).forEach((k) => delete rtHandlers[k]);
    emitSpy.mockReset();
    spinStore.lastProps = null;
    sidebarStore.lastProps = null;
    chatStore.lastProps = null;

    // crypto polyfill (avoid TS error and provide randomUUID)
    const baseCrypto: Crypto | {} = (originalCrypto ?? {}) as Crypto | {};
    const polyCrypto: Crypto = {
      ...(baseCrypto as any),
      randomUUID: vi.fn(() => "uuid-1"),
    } as any;

    Object.defineProperty(globalThis, "crypto", {
      value: polyCrypto,
      configurable: true,
    });

    // fetch mock
    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.startsWith("/api/party/state")) {
          const codeParam = url.split("code=")[1] ?? "ROOM01";
          return {
            ok: true,
            json: async () => buildStateResponse(codeParam),
          } as Response;
        }

        if (url === "/api/allergens") {
          return {
            ok: true,
            json: async () => ({ allergens: ["Peanuts", "Dairy"] }),
          } as Response;
        }

        if (url.includes("/api/party/spin")) {
          return {
            ok: true,
            json: async () => ({
              selection: [
                {
                  id: "dish-1",
                  name: "Pizza",
                  category: "Dinner",
                  tags: [],
                  allergens: [],
                },
                null,
                null,
              ],
            }),
          } as Response;
        }

        if (url === "/api/party/update") {
          return {
            ok: true,
            json: async () => ({ merged: { diet: "vegetarian" } }),
          } as Response;
        }

        // default
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      },
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();

    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
    });
  });

  it("wires basic child components and passes props down", async () => {
    render(
      <PartyClient
        code="room01"
        initialMemberId="member-1"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    expect(await screen.findByTestId("party-spin-machine")).toBeInTheDocument();
    expect(screen.getByTestId("party-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("party-chat")).toBeInTheDocument();

    // child props captured
    expect(spinStore.lastProps).not.toBeNull();
    expect(sidebarStore.lastProps).not.toBeNull();
    expect(chatStore.lastProps).not.toBeNull();

    // sidebar should eventually receive prefs and allergenOptions
    await waitFor(() => {
      expect(sidebarStore.lastProps.prefs).toEqual(
        expect.objectContaining({ allergens: ["Peanuts"] }),
      );
      expect(sidebarStore.lastProps.allergenOptions).toEqual(
        expect.arrayContaining(["Peanuts", "Dairy"]),
      );
    });
  });


  it("calls onGroupSpin from PartySpinMachine and shows alert if not host", async () => {
    // Mock window.alert since the component will alert when non-host tries to spin
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    render(
      <PartyClient
        code="spin01"
        initialMemberId="member-1"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    await screen.findByTestId("party-spin-machine");
    expect(spinStore.lastProps).not.toBeNull();

    fireEvent.click(screen.getByText("spin"));

    // Since skipAutoJoin doesn't set up livePeers, the user won't be considered host
    // So clicking spin will trigger the "Only the host can spin" alert
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Only the host can spin.");
    });

    alertSpy.mockRestore();
  });

  it("pushes prefs to server when onPrefChange is invoked", async () => {
    render(
      <PartyClient
        code="prefs01"
        initialMemberId="member-1"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    await screen.findByTestId("party-sidebar");
    expect(sidebarStore.lastProps).not.toBeNull();

    await act(async () => {
      sidebarStore.lastProps.onPrefChange({
        diet: "vegetarian",
        allergens: ["Peanuts", "Dairy"],
      });
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/party/update",
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      );
    });
  });

  it("emits chat messages via PartyChat handler", async () => {
    render(
      <PartyClient
        code="room02"
        initialMemberId="member-chat"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    await screen.findByTestId("party-chat");
    fireEvent.click(screen.getByText("send-chat"));

    await waitFor(() => {
      expect(emitSpy).toHaveBeenCalledWith(
        "chat",
        expect.objectContaining({
          code: "ROOM02",
          text: "hello from chat",
        }),
      );
    });
  });

  it("creates heartbeat and presence wiring without crashing", async () => {
    render(
      <PartyClient
        code="roomHB"
        initialMemberId="member-hb"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(emitSpy).toHaveBeenCalledWith(
        "hello",
        expect.objectContaining({ code: "ROOMHB" }),
      );
      expect(emitSpy).toHaveBeenCalledWith(
        "beat",
        expect.objectContaining({ code: "ROOMHB" }),
      );
      expect(emitSpy).toHaveBeenCalledWith(
        "sync_request",
        expect.objectContaining({ code: "ROOMHB" }),
      );
    });
  });

  it("per-slot onCategoryChange triggers a single-slot reroll for the host", async () => {
    render(
      <PartyClient
        code="spinCat"
        initialMemberId="member-1"
        skipAutoJoin
        onCodeChange={vi.fn()}
      />,
    );

    await screen.findByTestId("party-spin-machine");
    expect(spinStore.lastProps).not.toBeNull();

    fireEvent.click(screen.getByText("change-cat-0"));

    await waitFor(() => {
      // ensure a spin request happened; URL may include origin
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/party/spin"),
        expect.any(Object),
      );
    });
  });
});
