import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".audit/**",
      "public/**",
      "playwright-report/**",
      "test-results/**",
      "reports/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["*.{js,mjs,ts}", "scripts/**/*.{js,mjs}", "tests/**/*.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
