# logling

[![CI](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml)

日記を書くとキャラクターが成長する、続けたくなる日記アプリです。

**試してみる：https://logling.vercel.app**（インストールもログインも不要。日記はブラウザの中だけに保存され、外部には送られません）

## 概要

| 項目           | 内容                                                   |
| -------------- | ------------------------------------------------------ |
| 対象ユーザー   | 毎日日記を書きたいけれど、書くのを続けられない人       |
| 解決したいこと | 日記が続かないこと                                     |
| アプローチ     | 日記を書くたびにキャラクターが育ち、続ける理由をつくる |
| 公開先         | https://logling.vercel.app                             |

機能は [ロードマップ](docs/aidlc/roadmap.md) に沿って 1 つずつ開発しています。

## できること

「日記で経験値（`diary-exp`）」と「日記の振り返り（`diary-history`）」ができています。

- キャラクター（🐣）に名前を付ける（決める前に確認あり）
- 1 日 1 件の日記を書くと、キャラクターに経験値が 10 入り、たまるとレベルが上がる
- 1 日は朝 4 時で区切る（夜ふかしして書いた日記は前の日の日記になる）
- 「ふりかえり」のページで、これまでの日記を新しい順に読み返せる
- 今日を含めた最近 7 日の日記は、書き直したり消したりできる（消すと、その日記の経験値が減る）
- 最近 7 日のうち書き忘れた日には、後から日記を書ける（経験値は 5。名前を付けた日より前の日は書けない）
- データはブラウザの中（localStorage）だけに保存し、外部には送らない。ログインは不要
- スマホの画面幅で使えるように作っている

要件の詳細は [要件定義：日記で経験値](docs/requirements/diary-exp.md) と [要件定義：日記の振り返り](docs/requirements/diary-history.md) にあります。

## 技術スタック

| 分類           | 採用                                               |
| -------------- | -------------------------------------------------- |
| フレームワーク | Next.js 16（App Router）/ React 19                 |
| 言語           | TypeScript（strict）                               |
| スタイル       | Tailwind CSS v4                                    |
| 単体テスト     | Vitest + Testing Library                           |
| E2E テスト     | Playwright                                         |
| 静的解析・整形 | ESLint + Prettier                                  |
| CI             | GitHub Actions（lint・型チェック・テスト・ビルド） |
| 公開先         | Vercel（Hobby）                                    |

選定理由は [ADR-0001：技術スタック](docs/adr/0001-tech-stack.md) と [ADR-0003：公開先に Vercel を使う](docs/adr/0003-hosting-vercel.md) にまとめています。

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

`lint`・`typecheck`・`test` がすべて通ることを完了条件とし、push と PR ごとに CI で確認しています（CI では本番ビルドも確認します）。

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
