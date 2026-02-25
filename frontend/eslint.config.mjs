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
    },
  },
  js.configs.recommended,
  tseslintConfigs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  reactRefresh.configs.vite,
  tanstackQuery.configs["flat/recommended"],
  importPluginConfigs.recommended,
  importPluginConfigs.typescript,
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
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/**/": "KEBAB_CASE",
        },
      ],
    },
  },
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        {
          type: "feature",
          pattern: "src/features/*",
          mode: "folder",
        },
      ],
    },
    rules: {
      // This rule ensures that if you are in a feature,
      // you follow the internal folder structure
      "boundaries/no-unknown": ["error"],
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: "feature",
              allow: ["feature/views", "feature/_components", "feature/_hooks", "feature/store", "feature/api"],
              message: "Features must follow the standard structure (views, _components, _hooks, etc.)",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      // Rule: Imports may never start with /src
      // Rule: Enforce that private imports (from folders starting with _) must use relative paths
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
            {
              group: [
                "../**/features/**",
                "../**/core/**",
                "../**/components/**",
                "./features/**",
                "./core/**",
                "./components/**",
              ],
              message:
                "Please use path aliases (e.g., @core, @features) instead of relative imports (e.g., '../features', '../../core').",
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
  {
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Rule: Enforce import flow from low-level to high-level layers only (Components -> Core -> Features)
            // This maintains a clean architecture where low-level UI components do not depend on higher-level business logic or infrastructure.
            {
              target: "./src/components",
              from: "./src/core",
              message: "Components are low-level UI and cannot import from Core.",
            },
            {
              target: "./src/components",
              from: "./src/features",
              message: "Components are low-level UI and cannot import from Features.",
            },
            {
              target: "./src/core",
              from: "./src/features",
              message: "Core infrastructure cannot import from high-level Features.",
            },

            // Rule: Enforce that private folders (prefixed with _) can only be used within their own scope
            {
              target: "./src",
              from: "**/_**",
              except: ["./**/_**"],
              message: "Private folders (prefixed with _) can only be used within their own scope.",
            },
          ],
        },
      ],

      // Rule: Enforce that imports cannot reach into internal modules of other layers (e.g., @features/*/** or @core/*/**)
      "import-x/no-internal-modules": [
        "error",
        {
          forbid: [
            // This blocks importing deeper than the feature/core/component root unless it's a private folder.
            "@components/*/*",
            "@components/*/*/**",
            "@core/*/*",
            "@core/*/*/**",
            "@features/*/*",
            "@features/*/*/**",
          ],
        },
      ],
    },
  },
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
          ],
        },
      ],
    },
  },
);
