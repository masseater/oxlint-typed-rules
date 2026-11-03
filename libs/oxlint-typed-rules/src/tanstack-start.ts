import tanstackStart from "@tanstack/eslint-plugin-start";
import type { Plugin } from "vite-plus/lint/plugins";

import { typedRules } from "./typed-rule.ts";

const plugin = {
  meta: { name: "tanstack-start" },
  rules: typedRules(tanstackStart.rules),
} as const satisfies Plugin;

export default plugin;
