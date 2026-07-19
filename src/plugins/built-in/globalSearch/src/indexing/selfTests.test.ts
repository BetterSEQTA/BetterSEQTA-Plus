/**
 * @jest-environment jsdom
 */
import { runGlobalSearchSelfTests } from "./selfTests";

describe("globalSearch selfTests", () => {
  it("all in-process cases pass", async () => {
    const report = await runGlobalSearchSelfTests();
    expect(report.failed).toBe(0);
    expect(report.failures).toEqual([]);
  });
});
