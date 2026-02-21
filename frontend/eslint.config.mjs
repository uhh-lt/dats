// @ts-check

import js from "@eslint/js";
import tanstackQuery from "@tanstack/eslint-plugin-query";
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
  // {
  //   rules: {
  //     "no-restricted-imports": [
  //       "error",
  //       {
  //         patterns: [
  //           {
  //             // Prevent reaching into internal 'components' folders
  //             group: ["@core/**/components/**"],
  //             message: "Private components are internal. Use the domain index instead.",
  //           },
  //           {
  //             // Prevent reaching into specific sub-feature folders from outside @core
  //             // This forces: import { X } from '@core/source-document'
  //             // Instead of: import { X } from '@core/source-document/document-information'
  //             group: ["@core/*/*/**"],
  //             message: "Deep imports are forbidden. Please import from the top-level @core/[domain] index.",
  //           },
  //         ],
  //       },
  //     ],
  //   },
  // },
  // {
  //   files: ["src/features/**/*.{ts,tsx}"],
  //   rules: {
  //     "no-feature-to-feature-imports": [
  //       "error",
  //       {
  //         patterns: [
  //           {
  //             // Features cannot import from other features
  //             group: ["@features/*/**"],
  //             message: "Features must be isolated. Move shared logic to @core or @components.",
  //           },
  //         ],
  //       },
  //     ],
  //   },
  // },
  // {
  //   files: ["src/core/**/*.{ts,tsx}"],
  //   rules: {
  //     "no-feature-imports": [
  //       "error",
  //       {
  //         patterns: [
  //           {
  //             // Core cannot import from features
  //             group: ["@features/*/**"],
  //             message: "Core cannot import from features. Move shared logic to @core or @components.",
  //           },
  //         ],
  //       },
  //     ],
  //   },
  // },
  js.configs.recommended,
  tseslintConfigs.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,
  ...tanstackQuery.configs["flat/recommended"],
  importPluginConfigs.recommended,
  importPluginConfigs.typescript,
);
