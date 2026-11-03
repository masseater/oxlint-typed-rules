import { defineConfig } from "vite-plus";

const local = (path: string): string => new URL(path, import.meta.url).pathname;

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/tanstack-start.ts"],
    platform: "node",
    sourcemap: true,
    alias: {
      "@typescript-eslint/utils": local("src/typescript-eslint-utils.ts"),
      typescript: local("src/ts-compat.ts"),
    },
    deps: {
      alwaysBundle: ["@tanstack/eslint-plugin-start", "@typescript-eslint/utils", "globals"],
      neverBundle: [/^typescript-7(?:\/|$)/u],
    },
    dts: { generator: "oxc" },
    publint: { strict: true },
    attw: { profile: "esm-only", level: "error" },
  },
  resolve: {
    alias: [
      {
        find: /^@typescript-eslint\/utils$/u,
        replacement: local("src/typescript-eslint-utils.ts"),
      },
      { find: "@typescript-eslint/rule-tester", replacement: local("upstream/rule-tester.ts") },
      {
        find: "../rules/no-async-client-component/no-async-client-component.rule",
        replacement: local("upstream/rules/no-async-client-component.ts"),
      },
      {
        find: "../rules/no-client-code-in-server-component/no-client-code-in-server-component.rule",
        replacement: local("upstream/rules/no-client-code-in-server-component.ts"),
      },
      { find: /^vitest$/u, replacement: "vite-plus/test" },
      { find: /^typescript$/u, replacement: local("src/ts-compat.ts") },
    ],
  },
  test: {
    server: { deps: { inline: ["@tanstack/eslint-plugin-start"] } },
    include: ["src/**/*.test.ts", "upstream/src/__tests__/*.test.ts"],
  },
});
