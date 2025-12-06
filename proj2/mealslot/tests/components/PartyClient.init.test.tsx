import React from "react";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

// Mock the user context so PartyClient can call useUser() in tests
vi.mock("@/app/context/UserContext", () => ({
    useUser: () => ({ user: null, refreshUser: async () => { } }),
}));

import PartyClient from "../../components/PartyClient";

describe("PartyClient initializer", () => {
    const realFetch = global.fetch;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterAll(() => {
        global.fetch = realFetch;
    });

    it("fetches party state when initialized with initialMemberId and skipAutoJoin", async () => {
        const fakeState = { party: { id: "p1", code: "ABC123", isActive: true }, members: [] };

        global.fetch = vi.fn((input: RequestInfo) => {
            const url = String(input);
            if (url.startsWith("/api/party/state")) {
                return Promise.resolve({ ok: true, json: async () => fakeState } as any);
            }
            // default response for other fetches
            return Promise.resolve({ ok: true, json: async () => ({}) } as any);
        }) as unknown as typeof fetch;

        render(
            <PartyClient
                code={"ABC123"}
                onCodeChange={vi.fn()}
                initialNickname={"Tester"}
                skipAutoJoin={true}
                initialMemberId={"member-creator"}
            />
        );

        await waitFor(() => {
            expect((global.fetch as unknown as vi.Mock).mock.calls.some((c: any[]) => String(c[0]).includes("/api/party/state?code=ABC123"))).toBeTruthy();
        });
    });
});
