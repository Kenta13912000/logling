# ADR-0001：技術スタック

- 日付：2026-10-25
- 状態：採用（「実行環境」は [ADR-0004](0004-node-26.md) で置き換え）

## 背景

logling は「日記を書くとキャラクターが成長する、続けたくなる日記アプリ」で、Vercel で公開する。
転職活動のポートフォリオとして GitHub で公開するため、次の点を重視して技術スタックを決める。

- 個人開発でも小さく速く作れ、そのまま公開デプロイできること
- AI-DLC（Story → AC → テスト → 実装）の流れに合わせ、AC ごとのテストを書きやすいこと
- 品質の確認（静的解析・型チェック・テスト）を CI で自動化できること
- 依存やツールの出どころが明確で、セキュリティ上の判断を説明できること

## 決定

| 分類           | 採用                                   | 理由                                                                                   |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| フレームワーク | Next.js 16（App Router）               | 画面と API を 1 つのプロジェクトで書ける。公開先の Vercel と相性が最もよい             |
| UI             | React 19 + Tailwind CSS v4             | Next.js の標準構成。Tailwind は雛形の既定で入り、画面づくりを速くできるため残す        |
| 言語           | TypeScript（strict）                   | 型で仕様の一部を表せ、リファクタリングを安全にできる                                   |
| 実行環境       | Node.js 24.22.1（`.nvmrc` で固定）     | 現行の LTS。ローカルと CI で同じバージョンを使う（ADR-0004 で 26 系に置き換え）        |
| パッケージ管理 | npm                                    | Node.js に同梱されていて追加のツールが不要                                             |
| 単体テスト     | Vitest 5 + Testing Library（jsdom）    | 高速で TypeScript をそのまま扱える。画面をユーザー視点で検証でき、AC と対応させやすい  |
| E2E テスト     | Playwright（Chromium のみ）            | 実ブラウザで主要な流れを検証できる。ダウンロード量と実行時間を抑えるため Chromium のみ |
| 静的解析・整形 | ESLint（eslint-config-next）+ Prettier | Next.js 推奨のルールで不具合を防ぎ、書き方の揺れは Prettier に任せる                   |
| CI             | GitHub Actions                         | GitHub にコードを置くため追加のサービスが不要。push と PR で自動チェックできる         |

### 補足の判断

- **型チェックは `next typegen && tsc --noEmit`**：`LayoutProps` などの型は Next.js が `.next/types/` に生成する。何もない状態から始まる CI で失敗したため、先に型を生成する
- **`@types/node` は v24 系**：Vitest 5 が v20 系と組み合わせられないため、実行環境の Node 24 に合わせた（`--force` は使わない）。ADR-0004 で、Node 26 に合わせて 26 系にする
- **tsconfig の `@/*` は Vite 標準の `resolve.tsconfigPaths` で解決**：追加のプラグインを入れず依存を減らす
- **CI のセキュリティ**：アクションはコミット SHA で固定し、`permissions: contents: read`・`persist-credentials: false` で権限を最小にする
- **テレメトリ**：Next.js の匿名テレメトリは開発 PC と CI の両方で無効にする
- **改行コード**：`.gitattributes` と Prettier で LF に統一する（Windows で開発するため）

### ここでは決めないこと

DB・認証・デプロイの詳細設定は、必要になった機能の ⑤ 設計で別の ADR として決める（候補：Vercel + Supabase）。

## 検討した他の案

- **Vite + React（SPA）**：軽いが、ルーティングやサーバー処理を別に用意する必要がある。Vercel での公開と将来のサーバー処理を考え、Next.js を選んだ
- **Jest**：実績は多いが、TypeScript や ESM の設定が増える。設定が少なく速い Vitest を選んだ
- **Cypress**：E2E の候補。複数ブラウザ対応と並列実行が標準で使え、Next.js の公式例もある Playwright を選んだ
- **pnpm / Bun**：インストールは速いが、追加のツールが必要になる。個人開発の規模では npm で十分と判断した
- **Biome**：ESLint + Prettier の代わりになるが、Next.js 公式の ESLint ルールをそのまま使える構成を優先した

## 結果・影響

- `npm run lint`・`npm run typecheck`・`npm run test` を完了条件とし、CI で push と PR ごとに自動で確認する
- CI では本番ビルド（`npm run build`）も確認する（`diary-exp` の ⑧ で追加。サーバーでの事前描画でビルドが止まる問題を、手元の確認に頼らず検出するため）
- E2E テスト（`npm run test:e2e`）は CI に含めない。必要になった時点で追加を検討する
- Next.js は破壊的変更が多いため、実装時は `node_modules/next/dist/docs/` の公式ドキュメントを確認する（AGENTS.md）

## 判断メモ

- 初期構築の各ゲートで判断した点：Tailwind と AGENTS.md は残す／Next.js のテレメトリは無効化／コミットのメールアドレスは GitHub の noreply を使う（ポートフォリオとして公開するため）
- この ADR へのゲートでの判断：指摘なしで承認
- `diary-exp` の ⑧ で更新：CI に本番ビルドを追加（Bolt-3 でビルドが止まる問題が CI では見つからなかったため）
- Node 26 への更新で更新：「実行環境」を ADR-0004 で置き換えた（Node 24 が「保守のみ」の期間に入り、`account-sync` でサーバーの処理が入る前に新しい LTS に上げるため）。`@types/node` も 26 系にする
