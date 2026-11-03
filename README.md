# oxlint-typed-rules

型情報を要る ESLint のルールを、oxlint の JS プラグインとして動かす。
oxlint の JS プラグインには型情報が渡らないので（[oxc#19596](https://github.com/oxc-project/oxc/issues/19596)）、
tsconfig ごとに TypeScript の Program を作り、ルールが読む `parserServices` を用意する。
ESLint を入れずに、型情報を使うルールを oxlint だけで回せる。

## 公開先

- npm: [@r_masseater/oxlint-typed-rules](https://www.npmjs.com/package/@r_masseater/oxlint-typed-rules)

## 移植したルール

- `@r_masseater/oxlint-typed-rules/tanstack-start`
  - [@tanstack/eslint-plugin-start][tanstack] の 2 ルール

[tanstack]: https://github.com/TanStack/router/tree/main/packages/eslint-plugin-start

元のリポのテストを手を入れずに移植し、すべて同じ結果になることを確かめている。
TanStack Start の 2 ルールは、ファイルをまたぐと違反を取りこぼす点を直してある。

## 使い方

```sh
vp add -D @r_masseater/oxlint-typed-rules
```

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    jsPlugins: [
      {
        name: "tanstack-start",
        specifier: "@r_masseater/oxlint-typed-rules/tanstack-start",
      },
    ],
    rules: {
      "tanstack-start/no-client-code-in-server-component": "error",
      "tanstack-start/no-async-client-component": "error",
    },
  },
});
```

検査するファイルから一番近い `tsconfig.json` で Program を作る。
エディタの未保存の内容も、その中身で Program を作り直して検査する。

## ライセンス

MIT。同梱する元のプラグインのライセンスは `libs/oxlint-typed-rules/LICENSE` にある。
