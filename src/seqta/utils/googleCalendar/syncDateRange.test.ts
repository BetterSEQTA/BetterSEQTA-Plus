import { describe, expect, it } from "@jest/globals";
import {
  droppedWeekRange,
  syncWindowRange,
  trailingWeekRange,
} from "./syncDateRange";

describe("syncDateRange", () => {
  it("builds a 12-week rolling window from the current week", () => {
    const range = syncWindowRange(12);
    expect(range.from <= range.until).toBe(true);

    const start = new Date(`${range.from}T12:00:00`);
    const end = new Date(`${range.until}T12:00:00`);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    expect(days).toBe(12 * 7);
  });

  it("places the trailing week at the end of the window", () => {
    const window = syncWindowRange(12);
    const trailing = trailingWeekRange(12);
    expect(trailing.from >= window.from).toBe(true);
    expect(trailing.until <= window.until).toBe(true);
  });

  it("places the dropped week before the window start", () => {
    const window = syncWindowRange(12);
    const dropped = droppedWeekRange(12);
    expect(dropped.until < window.from).toBe(true);
  });
});
