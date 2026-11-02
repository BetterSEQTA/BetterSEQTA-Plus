import tailwindcss from "@tailwindcss/postcss";

/**
 * Tailwind 4 gives its `--tw-*` variables initial values through `@property`, which
 * browsers ignore inside shadow roots — and most of our UI lives in one. Tailwind
 * already emits a `*`-scoped fallback for browsers without `@property`, gated behind an
 * `@supports` check; unwrapping it makes those defaults apply everywhere.
 */
const shadowDomPropertyFallbacks = {
  postcssPlugin: "shadow-dom-property-fallbacks",
  AtRule: {
    layer(atRule) {
      if (atRule.params !== "properties") return;
      atRule.walkAtRules("supports", (supports) => supports.replaceWith(supports.nodes));
    },
  },
};

export default {
  plugins: [tailwindcss(), shadowDomPropertyFallbacks],
};
