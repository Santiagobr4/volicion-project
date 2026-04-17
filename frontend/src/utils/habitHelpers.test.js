import { describe, expect, it } from "vitest";
import { getPercentageStyle, getStatusStyle, getSymbol } from "./habitHelpers";

describe("habitHelpers", () => {
  it("maps statuses to symbols", () => {
    expect(getSymbol("done")).toBe("✔");
    expect(getSymbol("missed")).toBe("✖");
    expect(getSymbol("skip")).toBe("-");
    expect(getSymbol("pending")).toBe("⏳");
  });

  it("maps completion rate to color style", () => {
    expect(getPercentageStyle(90)).toContain("bg-green-500");
    expect(getPercentageStyle(65)).toContain("bg-yellow-400");
    expect(getPercentageStyle(30)).toContain("bg-red-500");
  });

  it("maps status to chip styles", () => {
    expect(getStatusStyle("done")).toContain("bg-green-500");
    expect(getStatusStyle("missed")).toContain("bg-red-500");
    expect(getStatusStyle("skip")).toContain("bg-gray-300");
    expect(getStatusStyle("pending")).toContain("bg-gray-200");
  });
});
