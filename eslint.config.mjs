import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // 포맷팅 관련 ESLint 규칙을 전부 끈다 — 서식은 Prettier 가 단독으로 책임진다.
  // 규칙을 "끄는" 설정이므로 반드시 배열 맨 마지막에 와야 한다.
  prettierConfig,
]);

export default eslintConfig;
