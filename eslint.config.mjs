import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TypeScript-specific rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/node_modules/**"],
    rules: {
      // Type safety rules - strict
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      // Allow state updates in mount effect - common pattern for data fetching
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override for NextAuth route (complex types)
  {
    files: ["src/app/api/auth/[...nextauth]/route.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    // Generated files
    "coverage/**",
    "html/**",
    // Configuration and script files
    "scripts/**",
    "next.config.analyzer.js",
  ]),
  // Allow any in test files (necessary for mocking)
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "__tests__/**/*.ts", "__tests__/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
]);

export default eslintConfig;