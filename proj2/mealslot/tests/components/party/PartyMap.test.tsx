/** @vitest-environment happy-dom */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach } from "vitest";

import PartyMap from "../../../components/party/PartyMap";

afterEach(() => {
  cleanup();
});

describe("PartyMap wrapper", () => {
  it("renders heading, description, and a PlacesMapCard with height 300", () => {
    const { container } = render(<PartyMap />);

    // Heading
    expect(screen.getByText(/eat outside/i)).toBeInTheDocument();

    // Description
    expect(
      screen.getByText(
        /Shows restaurants based on your approximate location\./i
      )
    ).toBeInTheDocument();

    // The PlacesMapCard renders as a card with an inner map div of height 300px
    const mapDiv = container.querySelector(".w-full") as HTMLDivElement | null;
    expect(mapDiv).not.toBeNull();
    // Inline style height should be 300px
    expect(mapDiv!.style.height).toBe("300px");
  });
});
