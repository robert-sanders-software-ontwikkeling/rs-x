import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import simpleSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

/**
 * ESLint Flat Config for TypeScript (ESLint 9)
 */
export default [
  // Ignore compiled and declaration files
  {
    ignores: ["**/dist/**", "**/*.d.ts"],
  },

  // TypeScript files
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
      "simple-import-sort": simpleSort,
    },

    rules: {
      // --- Core TS hygiene ---
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",

      // --- Type-only imports ---
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],

      // --- Import hygiene ---
      "import/no-duplicates": "error",

      // --- Sort imports ---
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Node.js built-ins
            ["^node:"],
            // External packages
            ["^@?\\w"],
            // Internal packages (your @rs-x scope)
            ["^(@rs-x)(/.*|$)"],
            // Parent imports
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            // Relative imports
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // Style imports
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
       "semi": ["error", "always"],
    },
  },
];