import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules — RE-ENABLED as warnings (were all "off")
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules — RE-ENABLED critical rule
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "off",
    // Advisory React-Compiler diagnostics (react-hooks v6):
    // - set-state-in-effect: remaining cases are intentional hydration-safe
    //   patterns (localStorage restore, matchMedia, client-only data init)
    // - preserve-manual-memoization: notices that the Compiler skips
    //   optimizing a component; manual memoization still works correctly
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/preserve-manual-memoization": "warn",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "warn",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules — RE-ENABLED critical rules
    "prefer-const": "warn",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "no-console": "warn",
    "no-debugger": "warn",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "warn",
    "no-useless-escape": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills/**", "examforgeai_repo/**", "scripts/**", "audit/**"]
}];

export default eslintConfig;
