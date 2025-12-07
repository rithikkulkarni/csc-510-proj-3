/** @vitest-environment happy-dom */

import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

import PartyChat from "../../../components/party/PartyChat";

afterEach(() => {
  cleanup();
});

describe("PartyChat", () => {
  it("renders header and empty state when there are no messages", () => {
    const onSendChat = vi.fn();

    render(<PartyChat chat={[]} onSendChat={onSendChat} />);

    expect(screen.getByText(/party chat/i)).toBeInTheDocument();
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send/i })
    ).toBeInTheDocument();
  });

  it("renders chat messages with sender and text", () => {
    const onSendChat = vi.fn();
    const ts = new Date("2024-01-01T12:34:56Z").getTime();

    const chat = [
      { id: "1", ts, from: "Alice", text: "Hello there" },
      { id: "2", ts, from: "Bob", text: "Hi!" },
    ];

    render(<PartyChat chat={chat} onSendChat={onSendChat} />);

    // Sender labels
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // Message texts
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("Hi!")).toBeInTheDocument();
  });

  it("clicking Send sends the input text and clears the field", async () => {
    const user = userEvent.setup();
    const onSendChat = vi.fn();

    render(<PartyChat chat={[]} onSendChat={onSendChat} />);

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;
    const button = screen.getByRole("button", { name: /send/i });

    await user.type(input, "Hi from button");
    expect(input.value).toBe("Hi from button");

    await user.click(button);

    expect(onSendChat).toHaveBeenCalledTimes(1);
    expect(onSendChat).toHaveBeenCalledWith("Hi from button");
    expect(input.value).toBe("");
  });

  it("pressing Enter in the input sends the message", async () => {
    const user = userEvent.setup();
    const onSendChat = vi.fn();

    render(<PartyChat chat={[]} onSendChat={onSendChat} />);

    const input = screen.getByPlaceholderText(/message/i) as HTMLInputElement;

    await user.type(input, "Sent via enter{enter}");

    expect(onSendChat).toHaveBeenCalledTimes(1);
    expect(onSendChat).toHaveBeenCalledWith("Sent via enter");
  });

  it("sends an empty string when Send is clicked with no text", async () => {
    const user = userEvent.setup();
    const onSendChat = vi.fn();

    render(<PartyChat chat={[]} onSendChat={onSendChat} />);

    const button = screen.getByRole("button", { name: /send/i });

    await user.click(button);

    expect(onSendChat).toHaveBeenCalledTimes(1);
    expect(onSendChat).toHaveBeenCalledWith("");
  });
});
