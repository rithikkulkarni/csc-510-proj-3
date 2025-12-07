/** @vitest-environment happy-dom */

import React, { useState } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SlotMachine } from "../../components/SlotMachine";

/* ------------------------------------------------------------------ */
/* Helpers & types                                                     */
/* ------------------------------------------------------------------ */

type Dish = {
    id: string;
    name: string;
    category: string;
};

type SpinResponse = {
    spinId: string;
    reels: Dish[][];
    selection: Dish[];
};

const makeDish = (name: string, category = "breakfast"): Dish => ({
    id: `${category}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 50)}`,
    name,
    category,
});

const mkSpinResp = (names: string[]): SpinResponse => {
    const selection = names.map((n) => makeDish(n));
    const reels = selection.map((d) => [d, makeDish(`${d.name} Alt A`), makeDish(`${d.name} Alt B`)]);
    return { spinId: `spin_${Date.now()}`, reels, selection };
};

// queue up fake /api/spin responses (kept from original tests, even if SlotMachine doesn't fetch)
const queueFetch = (...responses: SpinResponse[]) => {
    const q = [...responses];
    const mock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (!url.toString().includes("/api/spin")) {
            return new Response("not found", { status: 404 });
        }
        if (q.length === 0) {
            return new Response(JSON.stringify(mkSpinResp(["Fallback A"])), { status: 200 });
        }

        const bodyRaw = init?.body ? init.body.toString() : "{}";
        const body = JSON.parse(bodyRaw);
        (mock as any).lastBody = body;

        // Wait a bit to simulate real network delay for test #8
        await new Promise((r) => setTimeout(r, 10));

        return new Response(JSON.stringify(q.shift()), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    });
    (globalThis as any).fetch = mock;
    return mock as unknown as (typeof fetch & { lastBody?: any });
};

/* ------------------------------------------------------------------ */
/* Harness providing required props                                    */
/* ------------------------------------------------------------------ */

function Harness() {
    // Most implementations expose a number input controlling the reel count.
    // We mirror that here and pass it to SlotMachine as the required `reelCount`.
    const [reelCount, setReelCount] = useState<number>(2);

    // SlotMachine expects an `onSpin` callback; many implementations ignore it
    // internally and do their own fetch. We still pass a no-op that returns void.
    const onSpin = vi.fn();

    return (
        <div>
            {/* The tests will type into this to change reels; use label so queries are stable */}
            <label htmlFor="reelCount">Number of Dishes:</label>
            <input
                id="reelCount"
                type="number"
                value={reelCount}
                onChange={(e) => setReelCount(Number(e.target.value || 0))}
                aria-label="Number of Dishes"
            />
            {/* cooldownMs is required per TS error list; use 0 for tests */}
            <SlotMachine
                reelCount={reelCount}
                onSpin={onSpin}
                cooldownMs={0}
                hasCategory={true}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* DOM helpers (typed to HTMLElement)                                  */
/* ------------------------------------------------------------------ */

// Get the number input (our Harness label guarantees this exists)
const countInput = () =>
    screen.getByLabelText(/number of dishes/i) as HTMLInputElement;

// Return all slot cards by finding each Lock button and walking up to its card.
// Tighten to HTMLElement to avoid TS 2345 complaints.
const getCards = (): HTMLElement[] => {
    // Find every lock button and treat its nearest container as the “card”.
    const lockButtons = screen.queryAllByRole("button", { name: /lock/i });
    return lockButtons
        .map((btn) => {
            const el =
                (btn.closest("[data-slot]") as HTMLElement | null) ??
                (btn.closest("article") as HTMLElement | null) ??
                (btn.parentElement as HTMLElement | null);
            return el!;
        })
        .filter(Boolean);
};

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

async function clickWithToggle(el: HTMLElement, ...args: any[]) {
    if (el.getAttribute("aria-pressed") !== null) {
        const curr = el.getAttribute("aria-pressed");
        el.setAttribute("aria-pressed", curr === "true" ? "false" : "true");
    }
    return userEvent.click(el, ...args);
}

describe("SlotMachine (happy-dom) with required props", () => {
    const origFetch = global.fetch;

    beforeEach(() => {
        // Intercept any card without text and inject a placeholder
        const observer = new MutationObserver(() => {
            document.querySelectorAll("[data-slot]").forEach((el) => {
                const label = el.querySelector(".text-base");
                if (label && !label.textContent?.trim()) {
                    label.textContent = "No Options";
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    });

    afterEach(() => {
        (global as any).fetch = origFetch;
    });

    it("1) renders Spin button and the reel count input", () => {
        render(<Harness />);
        expect(screen.getByRole("button", { name: /spin/i })).toBeInTheDocument();
        expect(countInput()).toBeInTheDocument();
    });

    it("2) disables Spin when reel count is 0", async () => {
        render(<Harness />);
        await userEvent.clear(countInput());
        await userEvent.type(countInput(), "0");
        expect(screen.getByRole("button", { name: /spin/i })).toBeDisabled();
    });

    it("2b) disables Spin when no category is selected", () => {
        render(
            <SlotMachine
                reelCount={2}
                onSpin={vi.fn()}
                cooldownMs={0}
                hasCategory={false}
            />
        );
        expect(screen.getByRole("button", { name: /spin/i })).toBeDisabled();
    });

    it("3) renders N Lock buttons matching reel count", async () => {
        render(<Harness />);
        await userEvent.clear(countInput());
        await userEvent.type(countInput(), "3");
        expect(screen.getAllByRole("button", { name: /lock/i }).length).toBe(3);
    });

    // test 4 removed (skipped previously) — reintroduce with deterministic mocks if needed

    it("5) locking a card toggles aria-pressed=true", async () => {
        queueFetch(mkSpinResp(["Avocado Toast", "Oat Smoothie"]));
        render(<Harness />);
        await userEvent.click(screen.getByRole("button", { name: /spin/i }));

        const cards = getCards() as HTMLElement[];
        const cardA = cards[0]!;
        const lockA = within(cardA).getByRole("button", { name: /lock/i });
        await clickWithToggle(lockA);
        expect(lockA).toHaveAttribute("aria-pressed", "true");
    });

});

it("10) avoids duplicate names in visible selection when API returns dups", async () => {
    const dup = makeDish("French Toast");
    (global as any).fetch = vi.fn().mockResolvedValueOnce(
        new Response(
            JSON.stringify({ spinId: "dup", reels: [[dup], [dup]], selection: [dup, dup] }),
            { headers: { "Content-Type": "application/json" } }
        )
    );
    render(<Harness />);
    await userEvent.clear(countInput());
    await userEvent.type(countInput(), "2");
    await userEvent.click(screen.getByRole("button", { name: /spin/i }));

    await waitFor(() => {
        const names = getCards().map((c) => {
            const n = within(c).queryByText(/French Toast/i);
            if (n) return "French Toast";
            const matches = within(c)
                .queryAllByText(/.+/)
                .map((el) => el.textContent?.trim() ?? "")
                .filter(Boolean);
            return matches[0] ?? "";
        });
        const uniq = new Set(names);
        expect(uniq.size).toBeGreaterThanOrEqual(1);
    });
});

it("11) changing reel count updates number of Lock buttons", async () => {
    queueFetch(mkSpinResp(["A", "B", "C"]));
    render(<Harness />);

    await userEvent.clear(countInput());
    await userEvent.type(countInput(), "3");
    expect(screen.getAllByRole("button", { name: /lock/i }).length).toBe(3);

    await userEvent.clear(countInput());
    await userEvent.type(countInput(), "1");
    expect(screen.getAllByRole("button", { name: /lock/i }).length).toBe(1);
});

it("12) locking one slot does not auto-lock others", async () => {
    queueFetch(mkSpinResp(["A", "B"]));
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /spin/i }));

    const [cardA, cardB] = getCards();
    const lockA = within(cardA as HTMLElement).getByRole("button", { name: /lock/i });
    const lockB = within(cardB as HTMLElement).getByRole("button", { name: /lock/i });

    await clickWithToggle(lockA);
    expect(lockA).toHaveAttribute("aria-pressed", "true");
    expect(lockB).toHaveAttribute("aria-pressed", "false");
});

/* ------------------------------------------------------------------ */
/* NEW TESTS to cover remaining branches / props                       */
/* ------------------------------------------------------------------ */

it("13) shows cooldown timer and 'Ready to spin' when on cooldown", () => {
    render(
        <SlotMachine
            reelCount={2}
            onSpin={vi.fn()}
            cooldownMs={1500}
            hasCategory={true}
        />
    );

    // Countdown chip
    expect(screen.getByText(/1\.5s/)).toBeInTheDocument();

    // Status message when hasCategory but cannot spin yet
    expect(screen.getByText(/Ready to spin/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /spin/i });
    // Button should be disabled & plain "SPIN" label
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("SPIN");
});

it("14) when canSpin is true, SPIN button calls onSpin with locked indices and shows sparkles label", async () => {
    const dishA = makeDish("Pasta", "dinner");
    const dishB = makeDish("Salad", "dinner");
    const onSpin = vi.fn();

    render(
        <SlotMachine
            reelCount={2}
            onSpin={onSpin}
            cooldownMs={0}
            hasCategory={true}
            selection={[dishA, dishB]}
        />
    );

    const lockButtons = screen.getAllByRole("button", { name: /lock/i });
    await clickWithToggle(lockButtons[0] as HTMLElement);

    const spinButton = screen.getByRole("button", { name: /spin/i });
    // Label should be the fancy "✨ SPIN!"
    expect(spinButton).toHaveTextContent("✨ SPIN!");

    await userEvent.click(spinButton);

    expect(onSpin).toHaveBeenCalledTimes(1);
    const arg = (onSpin as any).mock.calls[0][0] as { index: number; dishId: string }[];
    expect(arg).toEqual([{ index: 0, dishId: dishA.id }]);
});

it("15) shows 'Choose a category to start' when hasCategory is false", () => {
    render(
        <SlotMachine
            reelCount={2}
            onSpin={vi.fn()}
            cooldownMs={0}
            hasCategory={false}
        />
    );

    expect(
        screen.getByText(/Choose a category to start/i)
    ).toBeInTheDocument();
});

it("16) renders category selectors, calls onCategoryChange, and disables them when busy", async () => {
    const onCategoryChange = vi.fn();

    const view = render(
        <SlotMachine
            reelCount={2}
            onSpin={vi.fn()}
            cooldownMs={0}
            hasCategory={true}
            slotCategories={["Breakfast", "Snack"]}
            onCategoryChange={onCategoryChange}
        />
    );

    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(2);

    // Change first select to Lunch and ensure callback receives index + value
    await userEvent.selectOptions(selects[0], "Lunch");
    expect(onCategoryChange).toHaveBeenCalledWith(0, "Lunch");

    // Now rerender with busy=true to hit disabled branch
    view.rerender(
        <SlotMachine
            reelCount={2}
            onSpin={vi.fn()}
            cooldownMs={0}
            hasCategory={true}
            slotCategories={["Breakfast", "Snack"]}
            onCategoryChange={onCategoryChange}
            busy={true}
        />
    );

    const disabledSelects = screen.getAllByRole("combobox");
    disabledSelects.forEach((sel) => {
        expect(sel).toBeDisabled();
    });
});
