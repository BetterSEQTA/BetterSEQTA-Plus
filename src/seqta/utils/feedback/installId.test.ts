import browser from "webextension-polyfill";
import { BSPLUS_INSTALL_ID_KEY } from "./constants";
import { generateInstallId, getOrCreateInstallId, isValidInstallId } from "./installId";

describe("installId", () => {
  it("validates and generates UUIDs", () => {
    expect(isValidInstallId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidInstallId("nope")).toBe(false);
    expect(isValidInstallId(generateInstallId())).toBe(true);
  });

  it("persists a new id and reuses it", async () => {
    const id = await getOrCreateInstallId();
    expect(isValidInstallId(id)).toBe(true);
    expect(await getOrCreateInstallId()).toBe(id);
    expect(browser.storage.local.set).toHaveBeenCalled();
    expect(BSPLUS_INSTALL_ID_KEY).toBe("bsplus_install_id");
  });
});
