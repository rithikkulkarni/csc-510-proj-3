/** @vitest-environment happy-dom */

import React from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach, vi } from "vitest";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  __esModule: true,
  Shuffle: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-shuffle" {...props} />
  ),
  RotateCcw: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-rotate" {...props} />
  ),
  Lock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-lock" {...props} />
  ),
  Unlock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-unlock" {...props} />
  ),
  ThumbsUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-thumbs-up" {...props} />
  ),
}));

// PrefsSchema is only used for typing in the component file
vi.mock("@/lib/party", () => ({
  __esModule: true,
  PrefsSchema: {},
}));

import PartySpinMachine from "../../../components/party/PartySpinMachine";

afterEach(() => {
  cleanup();
});

interface Dish {
  id: string;
  name: string;
  category: string;
  tags: string[];
  allergens: string[];
  ytQuery?: string;
}

type SpinTriple = [Dish | null, Dish | null, Dish | null];

type VoteEntry = { keep: Set<string>; reroll: Set<string> };
type VotesTriple = [VoteEntry, VoteEntry, VoteEntry];

const makeDish = (id: string, name: string, category = "Dinner"): Dish => ({
  id,
  name,
  category,
  tags: [],
  allergens: [],
});

const makeVotes = (
  keep0: string[] = [],
  reroll0: string[] = [],
  keep1: string[] = [],
  reroll1: string[] = [],
  keep2: string[] = [],
  reroll2: string[] = []
): VotesTriple => [
  { keep: new Set(keep0), reroll: new Set(reroll0) },
  { keep: new Set(keep1), reroll: new Set(reroll1) },
  { keep: new Set(keep2), reroll: new Set(reroll2) },
];

describe("PartySpinMachine", () => {
  it("renders power-ups, slots, and recent fallback when no recent spins", () => {
    const slots: SpinTriple = [
      makeDish("1", "Pasta", "Dinner"),
      makeDish("2", "Salad", "Lunch"),
      null,
    ];

    const { container } = render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId="me"
        recent={[]}
        slotCategories={["Breakfast", "Lunch", "Dinner"]}
        onCategoryChange={vi.fn()}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{ healthy: false, cheap: false, max30m: false }}
        onPowerupToggle={vi.fn()}
      />
    );

    // Power-Ups section
    expect(screen.getByText(/Power-Ups/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Healthy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cheap/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /≤30m/i })).toBeInTheDocument();

    // Slot titles (SpinCard)
    expect(screen.getByText("Pasta")).toBeInTheDocument();
    expect(screen.getByText("Salad")).toBeInTheDocument();
    // Null slot shows fallback text
    expect(screen.getByText(/No selection\./i)).toBeInTheDocument();

    // There should be YouTube links only for non-null slots
    const youtubeLinks = screen.getAllByRole("link", { name: /YouTube/i });
    expect(youtubeLinks.length).toBe(2);

    // Recent fallback message
    expect(
      screen.getByText(/Host rebroadcasts latest result to newcomers\./i)
    ).toBeInTheDocument();

    // Category selects are rendered
    const selects = container.querySelectorAll("select");
    expect(selects.length).toBe(3);
  });

  it("toggles power-ups and calls onPowerupToggle with correct keys", async () => {
    const user = userEvent.setup();
    const onPowerupToggle = vi.fn();

    render(
      <PartySpinMachine
        slots={[null, null, null]}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId="me"
        recent={[]}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{ healthy: false, cheap: true, max30m: false }}
        onPowerupToggle={onPowerupToggle}
      />
    );

    await user.click(screen.getByRole("button", { name: /Healthy/i }));
    await user.click(screen.getByRole("button", { name: /Cheap/i }));
    await user.click(screen.getByRole("button", { name: /≤30m/i }));

    expect(onPowerupToggle).toHaveBeenCalledTimes(3);
    expect(onPowerupToggle).toHaveBeenNthCalledWith(1, "healthy");
    expect(onPowerupToggle).toHaveBeenNthCalledWith(2, "cheap");
    expect(onPowerupToggle).toHaveBeenNthCalledWith(3, "max30m");
  });

  it("allows host to lock/unlock slots and calls onToggleLock, but disables for non-host", async () => {
    const user = userEvent.setup();
    const onToggleLock = vi.fn();

    const slots: SpinTriple = [
      makeDish("1", "Pizza"),
      makeDish("2", "Tacos"),
      makeDish("3", "Soup"),
    ];

    // Host: can lock/unlock
    render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId="me"
        recent={[]}
        onToggleLock={onToggleLock}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const lockButtons = screen.getAllByRole("button", { name: /Lock/i });
    expect(lockButtons.length).toBe(3);

    // Click first lock
    await user.click(lockButtons[0]);
    expect(onToggleLock).toHaveBeenCalledTimes(1);
    expect(onToggleLock).toHaveBeenCalledWith(0);

    cleanup();

    // Non-host: lock buttons are disabled and say "Host only"
    const onToggleLock2 = vi.fn();
    render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={false}
        memberId="me"
        recent={[]}
        onToggleLock={onToggleLock2}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const hostOnlyButtons = screen.getAllByRole("button", { name: /Lock/i });
    hostOnlyButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("title", "Host only");
    });

    // Clicking shouldn't call handler
    await user.click(hostOnlyButtons[0]);
    expect(onToggleLock2).not.toHaveBeenCalled();
  });

  it("enables vote buttons when memberId is set and calls onSendVote, with correct counts and styles", async () => {
    const user = userEvent.setup();
    const onSendVote = vi.fn();

    const me = "me-123";

    const slots: SpinTriple = [
      makeDish("1", "Burger"),
      makeDish("2", "Curry"),
      null,
    ];

    // For slot 0: I already voted keep; for slot 1, I already voted reroll.
    const votes = makeVotes(
      [me], // keep0
      [],   // reroll0
      [],   // keep1
      [me], // reroll1
      [],   // keep2
      []    // reroll2
    );

    render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={votes}
        isSpinning={false}
        iAmHost={true}
        memberId={me}
        recent={[]}
        onToggleLock={vi.fn()}
        onSendVote={onSendVote}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    // For slot 0, keep button should show count 1.
    const burgerCard = screen.getByText("Burger").closest("div")!;
    const burgerScope = within(burgerCard.parentElement!.parentElement!);
    const keepButton0 = burgerScope.getByRole("button", { name: /1/ });
    expect(keepButton0).toBeEnabled();

    await user.click(keepButton0);
    expect(onSendVote).toHaveBeenCalledWith(0, "keep");

    // For slot 1, reroll button should show count 1.
    const curryCard = screen.getByText("Curry").closest("div")!;
    const curryScope = within(curryCard.parentElement!.parentElement!);
    const rerollButton1 = curryScope.getByRole("button", { name: /1/ });
    await user.click(rerollButton1);
    expect(onSendVote).toHaveBeenCalledWith(1, "reroll");
  });

  it("disables vote buttons when memberId is null", () => {
    const slots: SpinTriple = [
      makeDish("1", "Burger"),
      null,
      null,
    ];

    render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId={null}
        recent={[]}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const card = screen.getByText("Burger").closest("div")!;
    const scope = within(card.parentElement!.parentElement!);
    const buttons = scope.getAllByRole("button");

    // Keep & reroll buttons are the ones whose text is just a number
    const keepReroll = buttons.filter((btn) =>
      (btn.textContent ?? "").trim().match(/^\d+$/)
    );

    expect(keepReroll.length).toBe(2);
    keepReroll.forEach((btn) => expect(btn).toBeDisabled());
  });

  it("handles category select changes and calls onCategoryChange", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    const slots: SpinTriple = [
      makeDish("1", "Omelette", "Breakfast"),
      makeDish("2", "Sandwich", "Lunch"),
      makeDish("3", "Stew", "Dinner"),
    ];

    const { container } = render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId="me"
        recent={[]}
        slotCategories={["Breakfast", "Lunch", "Dinner"]}
        onCategoryChange={onCategoryChange}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={vi.fn()}
        onReroll={vi.fn()}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const selects = container.querySelectorAll("select");
    expect(selects.length).toBe(3);

    await user.selectOptions(selects[0], "Dinner");
    expect(onCategoryChange).toHaveBeenCalledWith(0, "Dinner");
  });

  it("handles group spin / reroll buttons and status messages for host and non-host", async () => {
    const user = userEvent.setup();
    const onGroupSpin = vi.fn();
    const onReroll = vi.fn();

    const slots: SpinTriple = [
      makeDish("1", "Dish A"),
      makeDish("2", "Dish B"),
      makeDish("3", "Dish C"),
    ];

    // Host with memberId and not spinning: buttons enabled
    const { rerender } = render(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={true}
        memberId="me"
        recent={["Combo 1", "Combo 2"]}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={onGroupSpin}
        onReroll={onReroll}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const spinButton = screen.getByRole("button", { name: /✨ SPIN!/i });
    const rerollButton = screen.getByRole("button", { name: /Re-roll/i });

    expect(spinButton).toBeEnabled();
    expect(rerollButton).toBeEnabled();

    await user.click(spinButton);
    await user.click(rerollButton);

    expect(onGroupSpin).toHaveBeenCalledTimes(1);
    expect(onReroll).toHaveBeenCalledTimes(1);

    // Non-empty recent list should render entries instead of fallback
    expect(screen.getByText("Combo 1")).toBeInTheDocument();
    expect(screen.getByText("Combo 2")).toBeInTheDocument();

    // Status message when host & not spinning
    expect(
      screen.getByText(/Lock your favorites and spin again!/i)
    ).toBeInTheDocument();

    // Now render as non-host
    rerender(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={false}
        iAmHost={false}
        memberId="me"
        recent={[]}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={onGroupSpin}
        onReroll={onReroll}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Host controls the spin/i)
    ).toBeInTheDocument();

    // Host-only: buttons disabled
    const hostSpinButton = screen.getByRole("button", { name: /✨ SPIN!/i });
    expect(hostSpinButton).toBeDisabled();

    // Spinning state
    rerender(
      <PartySpinMachine
        slots={slots}
        locks={[false, false, false]}
        votes={makeVotes()}
        isSpinning={true}
        iAmHost={true}
        memberId="me"
        recent={[]}
        onToggleLock={vi.fn()}
        onSendVote={vi.fn()}
        onGroupSpin={onGroupSpin}
        onReroll={onReroll}
        powerups={{}}
        onPowerupToggle={vi.fn()}
      />
    );

    const spinningMatches = screen.getAllByText(/Spinning\.\.\./i);
    expect(spinningMatches.length).toBeGreaterThanOrEqual(1);
  });
});
