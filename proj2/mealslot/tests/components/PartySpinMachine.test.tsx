import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PartySpinMachine from "../../components/party/PartySpinMachine";

describe("PartySpinMachine", () => {
    it("renders three category dropdowns and calls onCategoryChange when changed", async () => {
        const onCategoryChange = vi.fn();
        const props = {
            slots: [null, null, null] as any,
            locks: [false, false, false] as [boolean, boolean, boolean],
            votes: [
                { keep: new Set(), reroll: new Set() },
                { keep: new Set(), reroll: new Set() },
                { keep: new Set(), reroll: new Set() },
            ] as any,
            isSpinning: false,
            iAmHost: true,
            memberId: "host-1",
            recent: [] as string[],
            slotCategories: ["Breakfast", "Lunch", "Dinner"],
            onCategoryChange,
            onToggleLock: vi.fn(),
            onSendVote: vi.fn(),
            onGroupSpin: vi.fn(),
            onReroll: vi.fn(),
            powerups: {},
            onPowerupToggle: vi.fn(),
        };

        render(<PartySpinMachine {...props} />);

        // There should be three select elements
        const selects = await screen.findAllByRole("combobox");
        expect(selects).toHaveLength(3);

        // Change the first select
        await userEvent.selectOptions(selects[0], "Dinner");
        expect(onCategoryChange).toHaveBeenCalledWith(0, "Dinner");
    });
});
