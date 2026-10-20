import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // eslint-plugin-react's React version auto-detection crashes on ESLint 10
  // ("contextOrFilename.getFilename is not a function"); pin it explicitly.
  { settings: { react: { version: "19" } } },
  globalIgnores([".next/**", "node_modules/**", "playwright-report/**"]),
]);
