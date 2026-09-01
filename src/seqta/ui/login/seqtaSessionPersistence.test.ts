/**
 * @jest-environment jsdom
 */
import {
  clearEphemeralSession,
  consumeSkipEphemeralLogout,
  enforceEphemeralSessionIfNeeded,
  hasEphemeralSessionPending,
  markEphemeralSession,
  markSkipEphemeralLogoutOnNextLoad,
} from "./seqtaSessionPersistence";

describe("seqtaSessionPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  it("tracks ephemeral sessions per host", () => {
    markEphemeralSession("school.example.edu.au");
    expect(hasEphemeralSessionPending("school.example.edu.au")).toBe(true);
    expect(hasEphemeralSessionPending("other.example.edu.au")).toBe(false);
    clearEphemeralSession("school.example.edu.au");
    expect(hasEphemeralSessionPending("school.example.edu.au")).toBe(false);
  });

  it("skips logout once after signing in without keep-me-logged-in", () => {
    markEphemeralSession("school.example.edu.au");
    markSkipEphemeralLogoutOnNextLoad();

    expect(consumeSkipEphemeralLogout()).toBe(true);
    expect(hasEphemeralSessionPending("school.example.edu.au")).toBe(true);
    expect(consumeSkipEphemeralLogout()).toBe(false);
  });

  it("clears stale ephemeral flags on the login page", async () => {
    markEphemeralSession(location.hostname);
    document.body.innerHTML = `<div class="login"></div>`;

    const fetchImpl = jest.fn();
    const reloading = enforceEphemeralSessionIfNeeded(fetchImpl);

    await expect(reloading).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(hasEphemeralSessionPending(location.hostname)).toBe(false);
  });

  it("logs out on a later visit when keep-me-logged-in was unchecked", async () => {
    markEphemeralSession(location.hostname);
    document.body.innerHTML = `<div id="content"></div>`;

    const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
    const reload = jest.fn();

    await expect(
      enforceEphemeralSessionIfNeeded(fetchImpl, reload),
    ).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/seqta/student/logout"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(reload).toHaveBeenCalled();
    expect(hasEphemeralSessionPending(location.hostname)).toBe(false);
  });
});
