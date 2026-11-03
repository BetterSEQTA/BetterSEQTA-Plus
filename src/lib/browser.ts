const browser: typeof chrome = (globalThis as { browser?: typeof chrome }).browser ?? chrome;

export default browser;
