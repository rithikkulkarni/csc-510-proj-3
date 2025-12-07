import React from "react";
import { describe, it, expect} from "vitest";
import { render} from "@testing-library/react";
import Loading from "../../app/loading";

describe("Loading page", () => {
  it("renders without crashing and renders nothing", () => {
    const { container } = render(<Loading />);

    // Empty fragment → no DOM output
    expect(container.firstChild).toBeNull();
  });
});
