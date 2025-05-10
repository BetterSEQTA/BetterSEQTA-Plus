/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  // Define rules that describe forbidden dependency patterns
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment:
        // Warn on circular dependencies, which can cause unexpected behavior or tight coupling.
        "This dependency is part of a circular relationship. You might want to revise " +
        "your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment:
        // Warn on orphan modules (modules not imported anywhere), as they may be unused or forgotten.
        "This is an orphan module - it's likely not used (anymore?). Either use it or " +
        "remove it. If it's logical this module is an orphan (i.e. it's a config file), " +
        "add an exception for it in your dependency-cruiser configuration...",
      from: {
        orphan: true,
        // Exclude common config and declaration files from the orphan check
        pathNot: [
          "(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$",
          "[.]d[.]ts$",
          "(^|/)tsconfig[.]json$",
          "(^|/)(?:babel|webpack)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$",
        ],
      },
      to: {},
    },
    {
      name: "no-deprecated-core",
      severity: "warn",
      comment:
        // Warn when depending on deprecated Node.js core modules
        "A module depends on a node core module that has been deprecated. Find an alternative...",
      from: {},
      to: {
        dependencyTypes: ["core"],
        // Match specific deprecated core modules
        path: [
          "^v8/tools/codemap$",
          "^v8/tools/consarray$",
          "^v8/tools/csvparser$",
          "^v8/tools/logreader$",
          "^v8/tools/profile_view$",
          "^v8/tools/profile$",
          "^v8/tools/SourceMap$",
          "^v8/tools/splaytree$",
          "^v8/tools/tickprocessor-driver$",
          "^v8/tools/tickprocessor$",
          "^node-inspect/lib/_inspect$",
          "^node-inspect/lib/internal/inspect_client$",
          "^node-inspect/lib/internal/inspect_repl$",
          "^async_hooks$",
          "^punycode$",
          "^domain$",
          "^constants$",
          "^sys$",
          "^_linklist$",
          "^_stream_wrap$",
        ],
      },
    },
    {
      name: "not-to-deprecated",
      severity: "warn",
      comment:
        // Warn when a dependency is deprecated on npm
        "This module uses a (version of an) npm module that has been deprecated...",
      from: {},
      to: {
        dependencyTypes: ["deprecated"],
      },
    },
    {
      name: "no-non-package-json",
      severity: "error",
      comment:
        // Error when using a dependency not listed in package.json
        "This module depends on an npm package that isn't in the 'dependencies' section of your package.json...",
      from: {},
      to: {
        dependencyTypes: ["npm-no-pkg", "npm-unknown"],
      },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment:
        // Error on dependencies that can't be resolved (not found on disk or missing package)
        "This module depends on a module that cannot be found ('resolved to disk')...",
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: "no-duplicate-dep-types",
      severity: "warn",
      comment:
        // Warn when a package is listed in multiple dependency types (e.g., dev and prod)
        "Likely this module depends on an external ('npm') package that occurs more than once...",
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ["type-only"], // Exclude type-only dependencies from this check
      },
    },

    // Optional rules you can tweak to your needs:

    {
      name: "not-to-spec",
      severity: "error",
      comment:
        // Error if production code depends on test files
        "This module depends on a spec (test) file...",
      from: {},
      to: {
        path: "[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$",
      },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment:
        // Error if production code imports devDependencies
        "This module depends on an npm package from the 'devDependencies' section of your " +
        "package.json. It looks like something that ships to production...",
      from: {
        path: "^(src)", // Match source code
        pathNot: "[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$", // Exclude test files
      },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only"], // Ignore type-only imports
        pathNot: ["node_modules/@types/"], // Allow type declarations
      },
    },
    {
      name: "optional-deps-used",
      severity: "info",
      comment:
        // Info message if optional dependencies are used (may indicate risk or specific design intent)
        "This module depends on an npm package that is declared as an optional dependency...",
      from: {},
      to: {
        dependencyTypes: ["npm-optional"],
      },
    },
    {
      name: "peer-deps-used",
      severity: "warn",
      comment:
        // Warn if peer dependencies are used; usually applies in plugin-like scenarios
        "This module depends on an npm package that is declared as a peer dependency...",
      from: {},
      to: {
        dependencyTypes: ["npm-peer"],
      },
    },
  ],

  // Global configuration options for dependency-cruiser
  options: {
    // Prevent traversing node_modules
    doNotFollow: {
      path: ["node_modules"],
    },

    // Restrict to pre-compilation dependencies (relevant for TypeScript)
    tsPreCompilationDeps: true,

    // Path to the project's TypeScript config file
    tsConfig: {
      fileName: "tsconfig.json",
    },

    // Extra Node.js core or runtime modules to treat as built-ins
    builtInModules: {
      add: [
        "bun",
        "bun:ffi",
        "bun:jsc",
        "bun:sqlite",
        "bun:test",
        "bun:wrap",
        "detect-libc",
        "undici",
        "ws",
      ],
    },

    // Optimize by skipping analysis not required by defined rules
    skipAnalysisNotInRules: true,

    // Configure module resolution
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      // aliasFields: ["browser"], // Enable if you're using browser-specific package fields
    },

    // Output settings for various reporters
    reporterOptions: {
      dot: {
        // Collapse node_modules paths in dot-format graphs
        collapsePattern: "node_modules/(?:@[^/]+/[^/]+|[^/]+)",
        // theme: { graph: { splines: "true" } }, // Uncomment to style graphs
      },
      archi: {
        // Collapse module folders in architectural graph
        collapsePattern:
          "^(?:packages|src|lib(s?)|app(s?)|bin|test(s?)|spec(s?))/[^/]+|node_modules/(?:@[^/]+/[^/]+|[^/]+)",
        // theme: {}, // Customize theme if needed
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};

// Configuration generated by dependency-cruiser@16.10.0 on 2025-02-16
