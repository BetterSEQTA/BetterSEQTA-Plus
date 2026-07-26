/**
 * @jest-environment jsdom
 */
import { waitForElm } from "@/seqta/utils/waitForElm";
import {
  resetSeqtaShellWaiters,
  waitForSeqtaMenu,
  waitForSeqtaTitle,
} from "./waitForSeqtaShell";

jest.mock("@/seqta/utils/waitForElm", () => ({
  waitForElm: jest.fn(),
}));

describe("waitForSeqtaShell", () => {
  beforeEach(() => {
    resetSeqtaShellWaiters();
    document.body.innerHTML = "";
    jest.mocked(waitForElm).mockReset();
  });

  it("returns existing #title without calling waitForElm", async () => {
    const el = document.createElement("div");
    el.id = "title";
    document.body.append(el);

    await expect(waitForSeqtaTitle()).resolves.toBe(el);
    expect(waitForElm).not.toHaveBeenCalled();
  });

  it("shares one waitForElm promise for concurrent #menu waiters", async () => {
    let resolveWait!: (el: Element) => void;
    const pending = new Promise<Element>((resolve) => {
      resolveWait = resolve;
    });
    jest.mocked(waitForElm).mockReturnValue(pending);

    const a = waitForSeqtaMenu();
    const b = waitForSeqtaMenu();
    expect(waitForElm).toHaveBeenCalledTimes(1);

    const menu = document.createElement("div");
    menu.id = "menu";
    resolveWait(menu);

    await expect(Promise.all([a, b])).resolves.toEqual([menu, menu]);
  });
});
