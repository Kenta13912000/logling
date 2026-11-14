# logling

[![CI](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml/badge.svg)](https://github.com/Kenta13912000/logling/actions/workflows/ci.yml)

日記を書くとキャラクターが成長する、続けたくなる日記アプリです。

**開発の記録（1 ページ）：[docs/case-study.md](docs/case-study.md)**（何を作ったか・AI と組んだ進め方・私が下した判断・やり直すなら）

**試してみる：https://logling.vercel.app**（インストールもログインも不要。ログインしなければ、日記はブラウザの中だけに保存され、外部には送られません。Google でログインすると、スマホでも PC でも続きが書けます）

## 概要

| 項目           | 内容                                                   |
| -------------- | ------------------------------------------------------ |
| 対象ユーザー   | 毎日日記を書きたいけれど、書くのを続けられない人       |
| 解決したいこと | 日記が続かないこと                                     |
| アプローチ     | 日記を書くたびにキャラクターが育ち、続ける理由をつくる |
| 公開先         | https://logling.vercel.app                             |

機能は [ロードマップ](docs/aidlc/roadmap.md) に沿って 1 つずつ開発しています。

## できること

「日記で経験値（`diary-exp`）」「日記の振り返り（`diary-history`）」「連続記録とボーナス（`streak`）」「キャラクターの成長（`character-evolution`）」「ログインとクラウド保存（`account-sync`）」「下のタブで画面を切り替える（`tab-navigation`）」「ホーム画面に追加と、書き忘れを防ぐお知らせ（`pwa-reminder`）」「キャラの名前を変える・暗い色の画面（`settings`）」ができています。

- キャラクター（ねこ）に名前を付ける（決める前に確認あり）。名前はあとから「設定」で何度でも変えられる（経験値や日記はそのまま）
- 1 日 1 件の日記を書くと、キャラクターに経験値が 10 入り、たまるとレベルが上がる
- 1 日は朝 4 時で区切る（夜ふかしして書いた日記は前の日の日記になる）
- 「ふりかえり」のページで、これまでの日記を新しい順に読み返せる
- 今日を含めた最近 7 日の日記は、書き直したり消したりできる（消すと、その日記の経験値が減る）
- 最近 7 日のうち書き忘れた日には、後から日記を書ける（経験値は 5。名前を付けた日より前の日は書けない）
- ホームで、何日続けて書けているかと、次の区切りまであと何日かがわかる
- 連続 3・7・14・30 日（そのあとは 15 日ごと）に届くと、ボーナス経験値が入る（その日に書いた日記だけ）
- レベルに応じて、キャラクターのすがたが 5 段階で変わる（ねこだま → ころねこ → ちびねこ → えらそうねこ → ねこ像）。絵は開発者が描いたオリジナル
- ログインしなければ、データはブラウザの中（localStorage）だけに保存し、外部には送らない
- Google でログインすると（任意）、キャラクターと日記がインターネット上に保存され、スマホでも PC でも同じアカウントで続きが書ける。日記は本人しか読めない
- ログイン前にブラウザで育てたキャラクターと日記は、ログインしたときにアカウントへ引き継げる（両方にいるときは、どちらで続けるかを選ぶ）
- 2 つの端末で同時に書いても、日記が 2 件になったり経験値が二重に入ったりしない
- ログアウトすると、その端末には日記が残らない。退会すると、アカウントと日記がすべて消える
- Google から受け取って残すのはメールアドレスと、アカウントを見分ける番号だけ。説明ページ「日記の保存のしかた」で、だれにでもわかる言葉で説明している
- 画面の下の「ホーム」「ふりかえる」「その他」のタブで、どの画面にも移れる（アカウント・日記の保存のしかた・設定は「その他」の中）。文字を打っている間はタブが隠れる
- スマホのホーム画面に追加して、アプリのように開ける（追加のしかたは「設定」に）
- ログインしている人は、「設定」で「書き忘れのお知らせ」をオンにすると、選んだ時刻（30 分ごと）に、まだ日記を書いていない日だけお知らせが届く。お知らせはオンにした端末にだけ届き、日記の本文は入らない
- 端末が暗い色の設定（ダークモード）のときは、画面も暗い色になる（文字の読みやすさは WCAG AA の目安を満たす）
- スマホの画面幅で使えるように作っている

要件の詳細は [要件定義：日記で経験値](docs/requirements/diary-exp.md) ・[要件定義：日記の振り返り](docs/requirements/diary-history.md)・[要件定義：連続記録とボーナス](docs/requirements/streak.md)・[要件定義：キャラクターの成長](docs/requirements/character-evolution.md)・[要件定義：ログインとクラウド保存](docs/requirements/account-sync.md)・[要件定義：下のタブで画面を切り替える](docs/requirements/tab-navigation.md)・[要件定義：ホーム画面に追加と、書き忘れを防ぐお知らせ](docs/requirements/pwa-reminder.md)・[要件定義：キャラの名前を変える・暗い色の画面](docs/requirements/settings.md) にあります。

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
| DB             | Neon（PostgreSQL）＋ Drizzle ORM。テストは PGlite  |
| 認証           | Better Auth（Google ログイン）                     |

選定理由は [ADR-0001：技術スタック](docs/adr/0001-tech-stack.md)、[ADR-0003：公開先に Vercel を使う](docs/adr/0003-hosting-vercel.md)、[ADR-0004：Node.js を 26 に上げる](docs/adr/0004-node-26.md)、[ADR-0005：DB に Neon、認証に Better Auth を使う](docs/adr/0005-db-auth-neon-better-auth.md)、[ADR-0006：ログインの環境の分け方と、テスト用のログイン](docs/adr/0006-auth-environments-and-test-login.md) にまとめています。お知らせの送り方は [ADR-0007](docs/adr/0007-push-notifications.md)、暗い色の画面の作り方は [ADR-0008](docs/adr/0008-dark-mode.md) にあります。

## 起動方法

Node.js 26 系（26.13.0 以上）が必要です（バージョンは [.nvmrc](.nvmrc) に記載）。

```bash
git clone https://github.com/Kenta13912000/logling.git
cd logling
npm ci
npm run dev
```

ブラウザで http://localhost:3000 を開きます。ログインしない使い方は、これだけで動きます。

ログインとクラウド保存も手元で動かすときは、Neon の開発用の枝（`dev`）と Google の OAuth クライアントを用意し、プロジェクトの直下の `.env.local`（Git には入れない）に次の値を書いてから、表を作ります（[ADR-0006](docs/adr/0006-auth-environments-and-test-login.md)）。

```bash
# .env.local
DATABASE_URL=            # Neon の dev の枝のつなぎ先（Connection pooling をオン）
BETTER_AUTH_SECRET=      # 32 バイト以上のランダムな値
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

```bash
npm run db:migrate   # .env.local の DATABASE_URL に表を作る
```

E2E テストを初めて実行するときは、テスト用のブラウザを入れます。E2E テストは 3100 番で開発サーバーを立ち上げ、ログインの流れはテスト用のログイン（本番では無効）と `.env.local` の `dev` の枝を使います。

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
| `npm run db:generate`  | 表の定義から、表を作る SQL を出力する        |
| `npm run db:migrate`   | 表を作る SQL を DB に当てる                  |

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
