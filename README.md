# logling

[![CI](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml)

日記を書くとキャラクターが成長する、続けたくなる日記アプリです。

## 概要

| 項目           | 内容                                                   |
| -------------- | ------------------------------------------------------ |
| 対象ユーザー   | 毎日日記を書きたいけれど、書くのを続けられない人       |
| 解決したいこと | 日記が続かないこと                                     |
| アプローチ     | 日記を書くたびにキャラクターが育ち、続ける理由をつくる |
| 公開先         | Vercel（準備中）                                       |

現在は初期構築が終わった段階です。機能は [ロードマップ](docs/aidlc/roadmap.md) に沿って 1 つずつ開発していきます（ロードマップは作成予定）。

## 技術スタック

| 分類           | 採用                                       |
| -------------- | ------------------------------------------ |
| フレームワーク | Next.js 16（App Router）/ React 19         |
| 言語           | TypeScript（strict）                       |
| スタイル       | Tailwind CSS v4                            |
| 単体テスト     | Vitest + Testing Library                   |
| E2E テスト     | Playwright                                 |
| 静的解析・整形 | ESLint + Prettier                          |
| CI             | GitHub Actions（lint・型チェック・テスト） |

選定理由は [ADR-0001：技術スタック](docs/adr/0001-tech-stack.md) にまとめています。

## 起動方法

Node.js 24.22.1 以上が必要です（バージョンは [.nvmrc](.nvmrc) に記載）。

```bash
git clone https://github.com/Kenta13912000/logling.git
cd logling
npm ci
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

E2E テストを初めて実行するときは、テスト用のブラウザを入れます。

```bash
npx playwright install chromium
```

## コマンド

| コマンド               | 用途                                         |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | 開発サーバー                                 |
| `npm run build`        | 本番ビルド                                   |
| `npm run lint`         | 静的解析（ESLint）                           |
| `npm run typecheck`    | 型チェック（`next typegen && tsc --noEmit`） |
| `npm run test`         | 単体テスト                                   |
| `npm run test:watch`   | 単体テスト（ファイル変更を監視）             |
| `npm run test:e2e`     | E2E テスト                                   |
| `npm run format`       | 整形                                         |
| `npm run format:check` | 整形のチェック                               |

`lint`・`typecheck`・`test` がすべて通ることを完了条件とし、push と PR ごとに CI で確認しています。

## ディレクトリ構成

```
src/
├─ app/                 # ルーティングとページ（薄く保ち、ロジックは features に置く）
├─ features/<unit>/     # 機能ごとのコンポーネント・ロジック・テスト
└─ lib/                 # 複数の機能で共有する処理
e2e/                    # Playwright のテスト
docs/                   # 開発プロセスの成果物（下記）
```

## 開発プロセス（AI-DLC）

このプロジェクトは AI-DLC（AI-Driven Development Lifecycle）で開発しています。
要件 → 設計 → テスト → 実装の各ステップを AI が提案し、人間が確認・承認してから次へ進めます。
承認の流れは、ステップごとのコミット履歴にも残しています。

| 成果物                                     | 置き場所                                                       |
| ------------------------------------------ | -------------------------------------------------------------- |
| 機能ごとの Intent / Stories / Units / 差分 | [docs/aidlc/](docs/aidlc/)（機能開発で作成）                   |
| 設計判断の記録（ADR）                      | [docs/adr/](docs/adr/)                                         |
| 実装から再生成した要件定義                 | [docs/requirements/](docs/requirements/)（機能の完了時に作成） |

進め方の詳細は [CLAUDE.md](CLAUDE.md) にあります。
