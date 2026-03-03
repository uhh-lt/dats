// @ts-check

import js from "@eslint/js";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import { flatConfigs as importPluginConfigs } from "eslint-plugin-import-x";
import * as reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint, { configs as tseslintConfigs } from "typescript-eslint";
// eslint-disable-next-line import-x/extensions
import localRules from "./eslint-dats-rules.js";

export default tseslint.config(
  { ignores: ["*/dist", "*/src/api/openapi", "**/routeTree.gen.ts"] },
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
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  tanstackQuery.configs["flat/recommended"],
  importPluginConfigs.recommended,
  importPluginConfigs.typescript,
  // FILE NAMING RULES
  {
    files: ["src/**/*.*"],
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
        { type: "types", pattern: "src/types/**" },
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
            { from: ["types"], allow: [] },
            { from: ["styles"], allow: [] },
            { from: ["utils"], allow: ["types"] },
            { from: ["hooks"], allow: ["types", "utils"] },
            { from: ["plugins"], allow: ["store", "api"] },
            { from: ["store"], allow: ["api", "core", "features"] },
            { from: ["api"], allow: ["types", "utils", "store", "plugins"] },
            {
              from: ["components"],
              allow: ["types", "styles", "utils", "hooks"],
              message:
                "Components are low-level UI and cannot import from Core or Features. Move shared logic to hooks or utils.",
            },
            {
              from: ["core"],
              allow: ["types", "styles", "utils", "plugins", "hooks", "store", "api", "components", "core"],
              message: "Core infrastructure cannot import from high-level Features or Routes.",
            },
            {
              from: ["features"],
              allow: ["types", "styles", "utils", "plugins", "hooks", "store", "api", "components", "core"],
              message: "Features cannot import from Routes or other Features. Keep features isolated.",
            },
            {
              from: ["routes"],
              allow: ["types", "styles", "utils", "plugins", "hooks", "store", "api", "components", "core", "features"],
            },
          ],
        },
      ],
    },
  },
  // IMPORT NAMING RULES
  {
    plugins: {
      local: localRules,
    },
    rules: {
      // Rule: Enforce path aliases for global folders based on resolved paths
      "local/enforce-global-aliases": "error",

      // Rule: Enforce relative imports within the same subdomain
      "local/no-alias-within-same-domain": "error",

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
          ts: "never",
          tsx: "never",
          js: "never",
          jsx: "never",
        },
      ],
    },
  },
  // Import private and internal folder restrictions
  {
    plugins: {
      local: localRules,
    },
    rules: {
      // Rule: Custom rule to enforce that private folders (prefixed with _) can only be accessed from within their own scope
      // This properly handles hierarchical scopes, e.g., my-feature/views/main/_components is only accessible from my-feature/views/main/**
      "local/no-private-folder-scope-violation": "error",

      // Rule: Enforce that imports cannot reach into internal modules of other layers (e.g., @features/*/** or @core/*/**)
      "import-x/no-internal-modules": [
        "error",
        {
          forbid: [
            "@components/*/*",
            "@components/*/*/**",
            "@core/*/*",
            "@core/*/*/**",
            "@features/*/*",
            "@features/*/*/**",
            "@plugins/*/*",
            "@plugins/*/*/**",
          ],
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
