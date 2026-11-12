# ADR-0006：ログインの環境の分け方と、テスト用のログイン

- 日付：2026-11-11
- 状態：採用

## 背景

[ADR-0005](0005-db-auth-neon-better-auth.md) で、DB は Neon、認証は Better Auth（Google だけ）にした。Bolt-2 でログインを作るにあたり、次のことを決める必要がある。

- 本番・手元の開発・PR ごとの確認用の公開で、どの DB と Google の設定を使うか
- 秘密の値（DB のつなぎ先、Better Auth の秘密の鍵、Google の秘密の値）をどこに置くか
- Google から受け取った情報のうち、何を保存するか（Better Auth は、最初は Google のトークンを暗号化せずに `account` 表に保存する。`account.encryptOAuthTokens` の既定は `false`）
- 本物の Google ログインは自動のテストで動かせない（Google の規約でも認められない）。ログインした状態の画面を、どう自動で確かめるか

## 決定

### 環境

| 環境                       | DB                                  | Google のログイン                                          | 秘密の値の置き場所                                        |
| -------------------------- | ----------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| 本番（logling.vercel.app） | Neon の `main` の枝                 | 使える                                                     | Vercel の環境変数（Production だけ）                      |
| 手元の開発・E2E テスト     | Neon の `dev` の枝（本番と別の DB） | 使える（`http://localhost:3000` を Google に登録する）     | 手元の `.env.local`（`.gitignore` 済みで Git に入らない） |
| PR ごとの確認用の公開      | なし                                | 使えない（Google に登録する戻り先の URL が毎回変わるため） | 置かない                                                  |
| CI の単体テスト            | PGlite（メモリの中）                | 使わない                                                   | 置かない                                                  |

- 確認用の公開では、ログインしようとすると「ログインできなかった」と出る（AC-5 と同じ表示）。ログインのない画面はこれまでどおり確かめられる
- 表の変更（`drizzle/` の SQL）は、`npm run db:migrate` で、先に `dev`、問題がなければ `main` に開発者の手元から当てる。本番に当てるのは、PR-2 を取り込む直前

### Google から受け取って保存する情報

- **Google のトークン（アクセストークン・リフレッシュトークン・ID トークン）は保存しない**。logling は Google の機能（カレンダーなど）を使わないため、持っている必要がない。Better Auth が保存する直前の処理（`databaseHooks.account.create.before`・`update.before`）で外す
- 人の表（`user`）には、**メールアドレスだけ**を残す。Google の表示名とアイコンの URL は、同じく保存する直前に外す（名前は空、アイコンはなし）。画面に出すのはメールアドレスだけ（AC-4）
- `account` 表には、Google のアカウントを見分ける ID（`account_id`）だけが残る

### テスト用のログイン

- **メールアドレスとパスワードでのログイン（Better Auth の `emailAndPassword`）を、テスト用にだけ有効にする**。有効になるのは、環境変数 `LOGLING_E2E_AUTH=1` があり、**かつ本番（`NODE_ENV=production`）でないとき**だけ。Playwright がテスト用の開発サーバーを立ち上げるときにだけ付ける
- 本番では、設定に関係なく必ず無効になることを、単体テストで確かめる
- 画面にはパスワードの入力欄を出さない。E2E テストが Better Auth の API を直接呼んで、テスト用の人を作り、ログインする
- 本物の Google ログインは、手元と本番で、開発者が手で確かめる

### そのほか

- Vercel の関数の場所は、`vercel.json` の `regions` でシンガポール（`sin1`）にする。設定をリポジトリに残し、取り込みの依頼で見えるようにするため（`release` では `vercel.json` を使わなかったが、ここで使い始める）
- DB へのつなぎ方は、Neon の部品の `Pool`（WebSocket。トランザクションが使える）を、モジュールの中で 1 つ作って使い回す。Vercel の勧めに従い、`@vercel/functions` の `attachDatabasePool` に渡して、使われていないつなぎを片付けさせる
- ログインの有効期間は 60 日。使うたびに（1 日 1 回まで）延びる。60 日使わなければ、もう一度ログインする

## 検討した他の案

| 案                                                                     | 採用しなかった理由                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Google のトークンを暗号化して保存する（`encryptOAuthTokens: true`）    | 暗号化しても、使わないものを持ち続けることになる。持たなければ、漏れることもない                                                             |
| ログインした状態の E2E テストをしない（単体テストと手での確認だけ）    | ログイン・ログアウト・引き継ぎ・退会は、画面をまたぐ流れが大事で、手での確認だけでは、あとの変更で壊れたことに気づけない                     |
| テスト用に、セッションを DB に直接書き込み、クッキーを作る             | Better Auth のクッキーの署名の作り方に頼ることになり、部品の更新で壊れやすい                                                                 |
| 確認用の公開でもログインできるようにする（Better Auth の oauth-proxy） | 仕組みが増える。確認用の公開は本人しか見られず、ログインは手元で確かめられる                                                                 |
| 手元の開発も PGlite にする                                             | 本番と同じ Neon のつなぎ方（WebSocket・トランザクション）を、取り込む前に確かめられなくなる                                                  |
| 関数の場所を Vercel の管理画面で変える                                 | リポジトリに残らず、あとから見てわからない                                                                                                   |
| ログインの有効期間を Better Auth の既定（7 日）のままにする            | 日記が続かない人は 1 週間あくこともあり、そのたびにログインし直すことになる。長すぎると、端末をなくしたときの危なさが増えるため、60 日にした |

## 結果・影響

- 秘密の値は、Vercel の環境変数（Production）と手元の `.env.local` だけに置く。Git には入れない。値の名前：`DATABASE_URL`・`BETTER_AUTH_SECRET`・`BETTER_AUTH_URL`・`GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET`
- 開発者が管理画面で行う作業が増える（Neon のプロジェクトと `dev` の枝、Google 側のアプリの登録、Vercel の環境変数）。手順は units.md の Bolt-2 の設計に書く
- Google の同意の画面には、開発者が登録する「サポートのメールアドレス」が表示される。公開してよいアドレスを使う
- 説明ページ（Bolt-7）には、保存するのはメールアドレスと Google のアカウントの ID だけで、トークン・名前・アイコンは保存しないことを書く
- `release` の要件定義書の「`vercel.json` は使わない」は、⑧ で書き直す

## 参考にした公式の情報

- Better Auth Next.js integration：https://www.better-auth.com/docs/integrations/next
- Better Auth Options（`account.encryptOAuthTokens`・`session.expiresIn`・`session.updateAge` など）：https://www.better-auth.com/docs/reference/options
- Better Auth Google：https://www.better-auth.com/docs/authentication/google
- Better Auth の保存する直前の処理（`databaseHooks`）の型：better-auth 1.7.20 の `@better-auth/core` の `init-options.d.mts`
- Neon serverless driver：https://neon.com/docs/serverless/serverless-driver
- Vercel Connection pooling with Vercel Functions：https://vercel.com/kb/guide/connection-pooling-with-functions
- Vercel Configuring regions for Vercel Functions：https://vercel.com/docs/functions/configuring-functions/region

## 判断メモ

- ゲートで確認した点：Google のトークンとは何か、保存しないと何が変わるかを確かめた（使う人から見た違いはなく、持たなければ漏れない）
- この ADR へのゲートでの判断：指摘なしで承認（確認用の公開ではログインできない、ログインの有効期間は 60 日、もこのまま。AC-6 を 60 日に書き直した）
