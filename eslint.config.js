import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import unicornPlugin from "eslint-plugin-unicorn";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/public/**",
      "*.mjs",
      "*.json"
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'writable',
        require: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      unicorn: unicornPlugin, 
      sonarjs: sonarjsPlugin, 
      perfectionist: perfectionistPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      ...prettierConfig.rules,
      "prettier/prettier": [
        "error",
        {
          arrowParens: "always",
          endOfLine: "auto",
          tabWidth: 2,
          jsxSingleQuote: true,
          semi: true,
          singleQuote: true,
          bracketSpacing: true,
          trailingComma: "all",
          printWidth: 120,
          useTabs: true
        }
      ],
      'unicorn/no-for-loop': 'error',
      'unicorn/no-useless-undefined': 'error',

      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'warn',

      'perfectionist/sort-objects': 'error',
      'perfectionist/sort-array-includes': 'error',

      'no-console': 'warn',
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      "no-shadow": "error",
      "prefer-const": "error",
      "arrow-body-style": ["error", "as-needed"],
      "no-param-reassign": "error",
      eqeqeq: ["error", "always"],

      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
];