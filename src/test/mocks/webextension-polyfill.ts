const storage = new Map<string, unknown>();

const local = {
  get: jest.fn(async (keys?: string | string[] | null) => {
    if (keys == null) {
      return Object.fromEntries(storage);
    }
    if (typeof keys === "string") {
      return keys in storage ? { [keys]: storage.get(keys) } : {};
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (storage.has(key)) out[key] = storage.get(key);
    }
    return out;
  }),
  set: jest.fn(async (items: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(items)) storage.set(k, v);
  }),
  remove: jest.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) storage.delete(key);
  }),
};

export default {
  storage: { local },
};

export function __resetBrowserStorageMock() {
  storage.clear();
  local.get.mockClear();
  local.set.mockClear();
  local.remove.mockClear();
}
