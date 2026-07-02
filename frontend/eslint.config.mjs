// @ts-check

import js from "@eslint/js";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import { flatConfigs as importPlugin } from "eslint-plugin-import-x";
import { configs as reactHooks } from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { configs as tseslintConfigs } from "typescript-eslint";
// eslint-disable-next-line import-x/extensions
import { datsRulesPlugin } from "./eslint-dats-rules.js";

const GLOBAL_DOMAINS = ["api", "components", "core", "features", "hooks", "routes", "store", "styles", "utils"];

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "src/api/core/**",
      "src/api/models/**",
      "src/api/services/**",
      "**/routeTree.gen.ts",
      "**/*.css",
      "**/*.md",
      "**/*.json",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      sourceType: "module",
    },
    settings: {
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
      // boundaries plugin uses import/resolver (not import-x/resolver)
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
      },
    },
  },
  js.configs.recommended,
  tseslintConfigs.recommended,
  reactHooks.flat["recommended-latest"],
  reactRefresh.configs.vite(),
  // ALLOW ROUTE EXPORTS IN TANSTACK ROUTER
  {
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  tanstackQuery.configs["flat/recommended"],
  importPlugin.recommended,
  importPlugin.typescript,
  // FILE NAMING RULES (excluding routes folder due to Tanstack Router's special naming conventions)
  {
    files: ["src/**/*.*"],
    ignores: ["src/routes/**"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      // Rule: Filename must match naming conventions
      // PascalCase or camelCase for files, kebab-case for folders
      "check-file/filename-naming-convention": [
        "error",
        {
          "src/**/*.{tsx}": "PASCAL_CASE",
          "src/**/*.{ts}": "CAMEL_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      // Rule: Folder names must be in kebab-case and can optionally start with an underscore (for private folders)
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/**/": "?(_)+([a-z0-9])*(-+([a-z0-9]))",
        },
      ],
    },
  },
  // ARCHITECTURE BOUNDARIES
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "styles", pattern: "src/styles/**" },
        { type: "utils", pattern: "src/utils/**" },
        { type: "plugins", pattern: "src/plugins/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "store", pattern: "src/store/**" },
        { type: "api", pattern: "src/api/**" },
        { type: "components", pattern: "src/components/*", mode: "folder", capture: ["componentName"] },
        { type: "core", pattern: "src/core/*", mode: "folder", capture: ["domain"] },
        { type: "features", pattern: "src/features/*", mode: "folder", capture: ["featureName"] },
        { type: "routes", pattern: "src/routes/**" },
      ],
    },
    rules: {
      // Rule: Enforce architectural boundaries - each layer can only import from appropriate lower layers
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          message: "Architectural boundary violation: ${file.type} cannot import from ${dependency.type}",
          rules: [
            // Plugins contain configurations for third-party libraries and do not contain domain-specific logic. Plugins are registered in main.tsx. No other layer should use them.
            { from: ["plugins"], allow: [] },
            // Styles contain global styles and design tokens. Styles are registered in main.tsx. No other layer should use them.
            { from: ["styles"], allow: [] },
            // Store contains global client state management logic. Having access to store, means having access to global states: layout, dialog, and project.
            { from: ["store"], allow: [] },
            // Utils are reusable functions. They do not contain domain-specific logic.
            { from: ["utils"], allow: [] },
            // Hooks are reusable functions. They do not contain domain-specific logic.
            { from: ["hooks"], allow: ["utils"] },
            // Components are low-level, reusable UI components. They do not contain domain-specific logic."
            {
              from: ["components"],
              allow: ["components", "hooks", "store", "utils"],
            },
            // API contains global server state management logic. Having access to API, means having access to all server state and mutation functions. It means being domain logic.
            { from: ["api"], allow: ["hooks", "store", "utils"] },
            // Core contains domain-specific logic and components that are shared across features.
            {
              from: ["core"],
              allow: ["api", "components", "core", "hooks", "store", "utils"],
            },
            // Features use generic and core components to compose domain-specific functionalities.
            {
              from: ["features"],
              allow: ["api", "components", "core", "hooks", "store", "utils"],
            },
            // Routes are the entry point of the application. They compose generic components, core components, and features to create pages.
            {
              from: ["routes"],
              allow: ["components", "core", "features"],
            },
          ],
        },
      ],
    },
  },
  // IMPORT NAMING RULES
  {
    plugins: {
      local: datsRulesPlugin,
    },
    rules: {
      // Rule: Enforce path aliases for global folders based on resolved paths
      "local/enforce-global-aliases": [
        "error",
        {
          globalFolders: GLOBAL_DOMAINS,
          foldersWithSubdomains: ["api", "components", "core", "features", "plugins"],
          srcDirName: "src",
        },
      ],

      // Rule: Enforce relative imports within the same subdomain
      "local/no-alias-within-same-domain": [
        "error",
        {
          globalFolders: GLOBAL_DOMAINS,
          srcDirName: "src",
        },
      ],

      // Rule: Imports may never start with /src
      // Rule: Imports may never be just "." or ".."
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["src/**", "/src/**"],
              message:
                "Please use path aliases (e.g., @core, @features) or relative paths instead of absolute src paths.",
            },
          ],
          paths: [
            {
              name: ".",
              message: "Please specify the file or folder explicitly (e.g., ./index or ./ComponentName).",
            },
            {
              name: "..",
              message: "Please specify the file or folder explicitly (e.g., ../index or ../parentFile).",
            },
          ],
        },
      ],

      // Rule: Imports may never end with certain file endings (.tsx, .ts)
      "import-x/extensions": [
        "error",
        "never",
        {
          css: "always",
        },
      ],
    },
  },
  // PUBLIC VS PRIVATE SCOPE RULES
  {
    plugins: {
      local: datsRulesPlugin,
    },
    rules: {
      // Rule: Custom rule to enforce that private folders (prefixed with _) can only be accessed from within their own scope
      // This properly handles hierarchical scopes, e.g., my-feature/views/main/_components is only accessible from my-feature/views/main/**
      "local/no-private-folder-scope-violation": [
        "error",
        {
          privatePrefixes: ["_"],
        },
      ],

      // Rule: Disallow deep alias imports and auto-fix to public entry imports (e.g., @core/memo/editor/* -> @core/memo)
      "local/no-internal-modules-public-entry": [
        "error",
        {
          aliases: ["components", "core", "features", "plugins"],
          depth: 2,
        },
      ],

      // Rule: Enforce scope boundaries - prevent importing from sibling directory branches
      "local/no-scope-violations": [
        "error",
        {
          sharedFolders: [
            "api",
            "components",
            "hooks",
            "store",
            "styles",
            "types",
            "utils",
            "_api",
            "_components",
            "_hooks",
            "_store",
            "_styles",
            "_types",
            "_utils",
          ],
        },
      ],

      // Rule: Prevent files from accessing Redux slices outside their scope.
      // Slice ownership is auto-detected from *Slice.ts file locations — no manual mapping needed.
      // Slices in store/global/ are always accessible from anywhere.
      "local/no-cross-slice-access": [
        "error",
        {
          srcDirName: "src",
        },
      ],
    },
  },
  // SPECIFIC RULES FOR INDEX FILES
  {
    files: ["src/**/index.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../**"],
              message: "Index files must not use relative imports (../). Only allowed to export from the same folder!",
            },
            {
              group: ["**/_*/**", "./**/_*/**"],
              message: "Index files must not export private folders (e.g., ./_components/ or ./_hooks/)!",
            },
          ],
        },
      ],
    },
  },
);
