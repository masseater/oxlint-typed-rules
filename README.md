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

## 性能

同じルールを ESLint（typescript-eslint）で動かした場合と比べた。
計測は 2026-11-03 に、次の条件で行った。

- 対象は [masseater.dev][masseater-dev] の `apps/portfolio/src`（238 ファイル）と、
  personal-space の `apps/slides/src`（1,434 ファイル、5.2 万行）である
- 比べた版は oxlint 1.90.0、oxlint-tsgolint 7.0.2005、
  ESLint 9.39.5、typescript-eslint 8.72.1（`projectService`）である
- `@tanstack/eslint-plugin-start` 0.1.0 が ESLint 10 に対応していないので、ESLint は 9 にした。
  ESLint 側にも同じ patch を当て、両者が同じ違反を出すことを確かめた
- Node.js 26.13.0、4 コア、メモリ 16 GB の Linux で測った
- cold は OS のページキャッシュを捨ててからの 3 回の中央値である
- warm はページキャッシュの載った状態での 5 回の中央値で、ESLint の `--cache` は使っていない
- メモリは子プロセスの tsgolint を含めた RSS の合計の最大値である

[masseater-dev]: https://github.com/masseater/masseater.dev

masseater.dev の `apps/portfolio/src` の結果は次のとおりである。

| ルールとツール                       |    cold |    warm |   メモリ |
| ------------------------------------ | ------: | ------: | -------: |
| ルール無し・oxlint                   | 0.11 秒 | 0.04 秒 |    92 MB |
| ルール無し・ESLint                   | 6.16 秒 | 5.37 秒 | 1,290 MB |
| TanStack の 2 ルール・このパッケージ | 7.29 秒 | 6.37 秒 | 1,183 MB |
| TanStack の 2 ルール・ESLint         | 6.26 秒 | 5.51 秒 | 1,327 MB |
| `no-floating-promises`・tsgolint     | 1.20 秒 | 1.01 秒 |   809 MB |
| `no-floating-promises`・ESLint       | 7.12 秒 | 6.42 秒 | 1,394 MB |
| 3 ルール・このパッケージと tsgolint  | 7.83 秒 | 7.24 秒 | 1,827 MB |
| 3 ルール・ESLint                     | 7.28 秒 | 6.47 秒 | 1,413 MB |

personal-space の `apps/slides/src` の結果は次のとおりである。

| ルールとツール                       |     cold |     warm |   メモリ |
| ------------------------------------ | -------: | -------: | -------: |
| ルール無し・oxlint                   |  0.13 秒 |  0.07 秒 |   111 MB |
| ルール無し・ESLint                   |  7.49 秒 |  6.80 秒 | 1,728 MB |
| TanStack の 2 ルール・このパッケージ |  8.91 秒 |  8.17 秒 | 1,417 MB |
| TanStack の 2 ルール・ESLint         | 10.42 秒 |  9.76 秒 | 1,764 MB |
| `no-floating-promises`・tsgolint     |  1.07 秒 |  0.92 秒 |   699 MB |
| `no-floating-promises`・ESLint       |  8.84 秒 |  7.99 秒 | 1,748 MB |
| 3 ルール・このパッケージと tsgolint  |  9.48 秒 |  8.65 秒 | 2,028 MB |
| 3 ルール・ESLint                     | 11.00 秒 | 10.10 秒 | 1,758 MB |

ESLint の `--cache` が当たると、どの組み合わせも 0.4〜0.5 秒、170〜210 MB で終わる。
ただし ESLint のキャッシュはファイルの中身だけを見る。
型の出どころのファイルが変わっても、型を使うルールを検査し直さない。

このパッケージの時間の大半は、TypeScript 6 で Program と型検査器を作る処理である。
masseater.dev では、6.8 秒の CPU 時間のうち 4.2 秒をこの処理に使っていた。
ESLint の `projectService` も、同じ処理に 4.0 秒を使っていた。
型を使う JS のルールの速さは、oxlint の速さではなく TypeScript の速さで決まる。
そのため masseater.dev では ESLint より 0.9 秒遅く、slides では 1.6 秒速かった。
tsgolint と併せると、型の情報を TypeScript 6 と tsgolint の TypeScript 7 で 2 度作る。
メモリはそのぶん増える。

typescript-eslint のルールで oxlint に同じ名前のものがあれば、tsgolint で動かす。
tsgolint は Go で書かれた TypeScript 7 で並列に型を調べる。
ESLint の 6〜9 倍速く、メモリも 4〜6 割で済む。
このパッケージは、tsgolint に無いルールを ESLint 無しで動かすためのものである。

## ライセンス

MIT。同梱する元のプラグインのライセンスは `libs/oxlint-typed-rules/LICENSE` にある。
