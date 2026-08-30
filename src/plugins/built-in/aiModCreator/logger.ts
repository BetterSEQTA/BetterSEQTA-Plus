const PREFIX = "[BetterSEQTA+ AI Mod Creator]";

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (typeof value === "string" && value.length > 4_000) {
    return `${value.slice(0, 4_000)}… (${value.length} chars)`;
  }
  return value;
}

export const aiModLog = {
  debug(scope: string, ...details: unknown[]) {
    console.debug(PREFIX, scope, ...details.map(serialize));
  },
  info(scope: string, ...details: unknown[]) {
    console.info(PREFIX, scope, ...details.map(serialize));
  },
  warn(scope: string, ...details: unknown[]) {
    console.warn(PREFIX, scope, ...details.map(serialize));
  },
  error(scope: string, ...details: unknown[]) {
    console.error(PREFIX, scope, ...details.map(serialize));
  },
  group(scope: string, label: string, fn: () => void) {
    console.groupCollapsed(`${PREFIX} ${scope} · ${label}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  },
};
