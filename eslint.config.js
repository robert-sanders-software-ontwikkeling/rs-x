import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

/**
 * ESLint Flat Config for TypeScript (ESLint 9)
 */
export default [
  {
    ignores: ["**/dist/**", "**/*.d.ts"],
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
      import: importPlugin,
    },

    rules: {
      // --- Core TS hygiene ---
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",

      // --- Type-only imports (verbatimModuleSyntax safe) ---
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // 🔑 THIS merges split imports from the same module
      "import/no-duplicates": "error",
    },
  },
];