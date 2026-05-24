import type { Plugin } from "vite";

/**
 * Firefox extension pages forbid eval / `Function` constructor. Some deps still emit:
 * - `Function(\`return this\`)()` (lodash-style global)
 * - `try { return Function(\`\`) / new Function("") … }` (feature probes, e.g. PDF.js / ORT)
 */
export function firefoxStripFunctionProbe(): Plugin {
  return {
    name: "firefox-strip-function-probe",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      if ((process.env.MODE || "chrome").toLowerCase() !== "firefox") return;

      const literalReplacements: [string, string][] = [
        ['try{return new Function(""),!0}catch{return!1}', "return!1"],
        ["try{return new Function(''),!0}catch{return!1}", "return!1"],
        ['try{return new Function(""),true}catch{return false}', "return false"],
        ["try{return new Function(''),true}catch{return false}", "return false"],
        // Empty template literal probe (minifier output)
        ["try{return Function(``),!0}catch{return!1}", "return!1"],
      ];

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk" || typeof chunk.code !== "string") continue;
        let { code } = chunk;

        code = code.replace(/Function\(`return this`\)\(\)/g, "(globalThis)");
        code = code.replace(/Function\("return this"\)\(\)/g, "(globalThis)");
        code = code.replace(/Function\('return this'\)\(\)/g, "(globalThis)");

        for (const [from, to] of literalReplacements) {
          if (code.includes(from)) {
            code = code.split(from).join(to);
          }
        }

        chunk.code = code;
      }
    },
  };
}
