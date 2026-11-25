import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import testingLibrary from "eslint-plugin-testing-library";

export default [
  { ignores: ["build/**", "node_modules/**"] },
  { linterOptions: { reportUnusedDisableDirectives: "off" } },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // The same jsx-a11y subset Create React App enforced. The stricter
      // interactive-element rules are left out on purpose: turning them on
      // flags existing components and belongs in its own change.
      ...Object.fromEntries(
        [
          "alt-text", "anchor-has-content", "anchor-is-valid", "aria-activedescendant-has-tabindex",
          "aria-props", "aria-proptypes", "aria-role", "aria-unsupported-elements", "heading-has-content",
          "iframe-has-title", "img-redundant-alt", "no-access-key", "no-distracting-elements",
          "no-redundant-roles", "role-has-required-aria-props", "role-supports-aria-props", "scope",
        ].map((r) => [`jsx-a11y/${r}`, "warn"]),
      ),
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true, varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.test.{js,jsx}", "src/setupTests.js"],
    ...testingLibrary.configs["flat/react"],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest, vi: "readonly" } },
  },
];
