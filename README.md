# oxlint-typed-rules

型情報を要る ESLint のルールを、oxlint の JS プラグインとして動かす。
oxlint の JS プラグインには型情報が渡らないので（[oxc#19596](https://github.com/oxc-project/oxc/issues/19596)）、
TypeScript 7 の API で Program と型検査器を作り、ルールが読む `parserServices` を用意する。
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

検査するファイルを含む tsconfig の Program を、TypeScript 7（tsgo）の子プロセスに作らせる。
エディタの未保存の内容も、その中身で Program を作り直して検査する。

## TypeScript 7 との変換層

同梱したルールは TypeScript 6 の `ts` 名前空間と `Program`・`TypeChecker` を読む。
TypeScript 7.1 の `typescript/sync` は形が違う。
そこで、2 ルールが使う分だけを TypeScript 6 の形に見せる層を持つ。
この層は暫定である。
typescript-eslint の [#12803][tse-12803] が同じ層を持つので、
それが公開されたら乗り換える（[#13][issue-13]）。

[tse-12803]: https://github.com/typescript-eslint/typescript-eslint/pull/12803
[issue-13]: https://github.com/masseater/oxlint-typed-rules/issues/13

## 性能

同じルールを ESLint（typescript-eslint）で動かした場合と比べた。
計測は 2026-11-03 に、次の条件で行った。

- 対象は [masseater.dev][masseater-dev] の `apps/portfolio/src`（238 ファイル）と、
  personal-space の `apps/slides/src`（1,434 ファイル、5.2 万行）である
- oxlint の側は oxlint 1.90.0、oxlint-tsgolint 7.0.2005、TypeScript 7.1.0-beta で測った
- ESLint の側は ESLint 9.39.5、typescript-eslint 8.72.1（`projectService`）で測った
- `@tanstack/eslint-plugin-start` 0.1.0 が ESLint 10 に対応していないので、ESLint は 9 にした。
  ESLint 側にも同じ patch を当て、両者が同じ違反を出すことを確かめた
- Node.js 26.13.0、4 コア、メモリ 16 GB の Linux で測った
- cold は OS のページキャッシュを捨ててからの 3 回の中央値である
- warm はページキャッシュの載った状態での 5 回の中央値で、ESLint の `--cache` は使っていない
- メモリは子プロセスの tsgo と tsgolint を含めた RSS の合計の最大値である

[masseater-dev]: https://github.com/masseater/masseater.dev

masseater.dev の `apps/portfolio/src` の結果は次のとおりである。

| ルールとツール                       |    cold |    warm |   メモリ |
| ------------------------------------ | ------: | ------: | -------: |
| ルール無し・oxlint                   | 0.11 秒 | 0.06 秒 |    99 MB |
| ルール無し・ESLint                   | 6.29 秒 | 5.93 秒 | 1,288 MB |
| TanStack の 2 ルール・このパッケージ | 1.90 秒 | 1.61 秒 |   769 MB |
| TanStack の 2 ルール・ESLint         | 6.76 秒 | 5.75 秒 | 1,324 MB |
| `no-floating-promises`・tsgolint     | 1.22 秒 | 1.03 秒 |   796 MB |
| `no-floating-promises`・ESLint       | 7.15 秒 | 6.35 秒 | 1,395 MB |
| 3 ルール・このパッケージと tsgolint  | 2.84 秒 | 2.59 秒 | 1,449 MB |
| 3 ルール・ESLint                     | 7.53 秒 | 6.64 秒 | 1,416 MB |

personal-space の `apps/slides/src` の結果は次のとおりである。

| ルールとツール                       |     cold |     warm |   メモリ |
| ------------------------------------ | -------: | -------: | -------: |
| ルール無し・oxlint                   |  0.17 秒 |  0.06 秒 |   107 MB |
| ルール無し・ESLint                   |  7.69 秒 |  6.95 秒 | 1,700 MB |
| TanStack の 2 ルール・このパッケージ |  3.83 秒 |  3.81 秒 |   911 MB |
| TanStack の 2 ルール・ESLint         | 10.56 秒 |  9.70 秒 | 1,799 MB |
| `no-floating-promises`・tsgolint     |  1.04 秒 |  0.91 秒 |   697 MB |
| `no-floating-promises`・ESLint       |  8.96 秒 |  8.29 秒 | 1,737 MB |
| 3 ルール・このパッケージと tsgolint  |  4.79 秒 |  4.57 秒 | 1,500 MB |
| 3 ルール・ESLint                     | 11.00 秒 | 10.31 秒 | 1,763 MB |

TanStack の 2 ルールは、ESLint の 2.5〜3.6 倍の速さで、メモリは 5〜6 割で済む。
TypeScript 6 で Program を作っていた 0.0.2 では、
warm で masseater.dev が 6.37 秒、slides が 8.17 秒だった。
時間の大半が TypeScript 6 で Program と型検査器を作る処理だったので、そこを tsgo に任せた。

slides の 3.8 秒のうち、tsgo との往復は 1.1 秒で、そのうち tsgo の中の処理は 0.8 秒だった。
残りは、tsgo から受け取った構文木を JS の側で組み立て、ルールを動かす時間である。
oxlint のスレッドの数を 1 から 4 に変えても、時間はほぼ変わらなかった。

ESLint の `--cache` が当たると、どの組み合わせも 0.4〜0.5 秒、170〜210 MB で終わる。
ただし ESLint のキャッシュはファイルの中身だけを見る。
型の出どころのファイルが変わっても、型を使うルールを検査し直さない。

typescript-eslint のルールで oxlint に同じ名前のものがあれば、tsgolint で動かす。
tsgolint は Go で書かれた TypeScript 7 で並列に型を調べる。
ESLint の 6〜9 倍速く、メモリも 4〜6 割で済む。
このパッケージは、tsgolint に無いルールを ESLint 無しで動かすためのものである。
tsgolint と併せると、型の情報を tsgo と tsgolint で 2 度作り、メモリはそのぶん増える。

## ライセンス

MIT。同梱する元のプラグインのライセンスは `libs/oxlint-typed-rules/LICENSE` にある。
