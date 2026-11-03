import plugin from "@r_masseater/oxlint-typed-rules/tanstack-start";
import { Option, Record } from "effect";

const name = "no-client-code-in-server-component";

const rule = Record.get(plugin.rules, name).pipe(
  Option.getOrThrowWith(() => new Error(`rule ${name} is missing`)),
);

export { name, rule };
