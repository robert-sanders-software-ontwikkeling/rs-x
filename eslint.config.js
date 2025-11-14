// eslint.config.js
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

/**
 * ESLint Flat Config for TypeScript (ESLint 9)
 */
export default [
  {
    ignores: ["dist/**", "**/*.d.ts"], // ignore build output & type definitions
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: process.cwd(),
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: globals.node,
    },

    plugins: {
      "@typescript-eslint": tseslint,
    },

    rules: {
      // Core & TS rules
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
];