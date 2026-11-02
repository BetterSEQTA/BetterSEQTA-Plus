import tailwindcss from "@tailwindcss/postcss";

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
