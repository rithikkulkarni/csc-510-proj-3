import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: { data: any }) => void) | null = null;

  // all channels per name
  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: any) {
    const set = MockBroadcastChannel.channels.get(this.name);
    if (!set) return;
    for (const ch of set) {
      ch.onmessage?.({ data });
    }
  }

  close() {
    const set = MockBroadcastChannel.channels.get(this.name);
    if (!set) return;
    set.delete(this);
  }
}

class MockWebSocket {
  url: string;
  onmessage: ((ev: { data: any }) => void) | null = null;
  onopen: (() => void) | null = null;
  sent: string[] = [];

  static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    // simulate async open
    setTimeout(() => {
      if (this.onopen) {
        this.onopen();
      }
    }, 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    // nothing needed for test
  }
}


beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getRealtimeForRoom - BroadcastChannel (BCWire)", () => {
  it("uses BroadcastChannel when NEXT_PUBLIC_WS_URL is not set and delivers events", async () => {
    const prev = process.env.NEXT_PUBLIC_WS_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;

    // Stub global BroadcastChannel
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as any);

    // Dynamically import after stubbing globals
    const { getRealtimeForRoom } = await import("../../lib/realtime"); // adjust path if needed

    const wire: any = await getRealtimeForRoom("ROOM1");
    expect(wire.kind).toBe("bc");

    const received: any[] = [];
    wire.on("greet", (payload: any) => {
      received.push(payload);
    });

    wire.emit("greet", { msg: "hello" });

    expect(received).toEqual([{ msg: "hello" }]);

    wire.close();

    // restore env
    if (prev !== undefined) process.env.NEXT_PUBLIC_WS_URL = prev;
  });
});

describe("getRealtimeForRoom - WebSocket (WSWire)", () => {
  it("uses WebSocket when NEXT_PUBLIC_WS_URL is set and sends messages with room/type/payload", async () => {
    const prev = process.env.NEXT_PUBLIC_WS_URL;
    process.env.NEXT_PUBLIC_WS_URL = "https://example.com/realtime";

    // Reset instances for this test run
    MockWebSocket.instances = [];

    // Stub global WebSocket
    vi.stubGlobal("WebSocket", MockWebSocket as any);

    const { getRealtimeForRoom } = await import("../../lib/realtime"); // adjust path if needed

    const wire: any = await getRealtimeForRoom("ROOM2");
    expect(wire.kind).toBe("ws");

    // There should be exactly one WS instance for this test
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0]!;
    expect(ws.url).toBe("wss://example.com/realtime"); // http→ws replacement

    // emit should send JSON with { room, type, payload }
    await wire.emit("greet", { msg: "hello" });

    expect(ws.sent).toHaveLength(1);
    const sentObj = JSON.parse(ws.sent[0]!);
    expect(sentObj).toEqual({
      room: "ROOM2",
      type: "greet",
      payload: { msg: "hello" },
    });

    // on() should register a handler that fires when room & type match
    const received: any[] = [];
    await wire.on("update", (payload: any) => {
      received.push(payload);
    });

    // Simulate a single matching message
    ws.onmessage?.({
      data: JSON.stringify({
        room: "ROOM2",
        type: "update",
        payload: { v: 1 },
      }),
    });

    expect(received).toEqual([{ v: 1 }]);

    wire.close();

    if (prev !== undefined) process.env.NEXT_PUBLIC_WS_URL = prev;
    else delete process.env.NEXT_PUBLIC_WS_URL;
  });
});