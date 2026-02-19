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
        typescript: true,
        node: true,
      },
    },
  },
  js.configs.recommended,
  tseslintConfigs.recommended,
  reactHooks.configs["recommended-latest"],
  reactRefresh.configs.vite,
  ...tanstackQuery.configs["flat/recommended"],
  importPluginConfigs.recommended,
  importPluginConfigs.typescript,
);
