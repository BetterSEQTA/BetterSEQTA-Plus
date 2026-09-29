import {
  isIndexingActive,
  setIndexingActive,
} from "./indexingState";

describe("indexingState", () => {
  afterEach(() => {
    setIndexingActive(false);
  });

  it("tracks whether structured indexing is running", () => {
    expect(isIndexingActive()).toBe(false);
    setIndexingActive(true);
    expect(isIndexingActive()).toBe(true);
    setIndexingActive(false);
    expect(isIndexingActive()).toBe(false);
  });
});
