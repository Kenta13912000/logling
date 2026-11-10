# ADR-0005：DB に Neon、認証に Better Auth（Google ログイン）を使う

- 日付：2026-11-11
- 状態：採用

## 背景

`account-sync` で、ログインした人の日記とキャラクターをクラウドに保存する（[intent.md](../aidlc/account-sync/intent.md)）。条件は次のとおり。

- ログインは任意で、方法は Google アカウントだけ（メールを送る仕組みは使わない）
- クラウドの日記とキャラクターは、ログインした本人しか読み書きできない（SC-6）
- 個人のポートフォリオなので、無料で使える。使う人が少なくても、いつ開いても動く
- 公開先は Vercel の無料プラン（[ADR-0003](0003-hosting-vercel.md)）。使う人の多くは日本にいる

## 決定

| 分類                 | 採用                                                                           | 理由                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| DB                   | **Neon**（PostgreSQL、無料プラン）。場所はシンガポール（`aws-ap-southeast-1`） | 使われないと休むが、次の利用で自動で戻る。Neon に東京はなく、日本から最も近い                                                          |
| 認証                 | **Better Auth**（アプリの中で動く部品。Google だけを使う）                     | ログインの戻り先が自分のアプリ（`/api/auth/callback/google`）なので、Google の許可の画面に `logling.vercel.app` が出る。MIT ライセンス |
| DB の読み書き        | **Drizzle ORM**（安定版の 0.45 系）と drizzle-kit（表の作り方の管理）          | TypeScript の型で表と読み書きをそろえられる。Better Auth に Drizzle 用のつなぎ方がある。1.0 はまだ試験版（RC）なので使わない           |
| DB へのつなぎ方      | Neon の公式の部品（`@neondatabase/serverless`）                                | Vercel のサーバーの処理から使う前提の部品                                                                                              |
| サーバーの処理の場所 | Vercel の関数の場所をシンガポール（`sin1`）にする                              | DB と同じ場所に置き、往復の時間を減らす。無料プランでも 1 か所を選べる。設定の方法は Bolt-2 で決める                                   |
| テストの DB          | **PGlite**（PostgreSQL をアプリの中で動かす部品）                              | 手元と CI で、Docker も秘密の値も使わずに、本物と同じ PostgreSQL の上で「本人しか読めない」を確かめられる                              |

### 本人しか読み書きできないようにする守り方

- DB には、logling のサーバーからだけつなぐ。DB へのつなぎ先（秘密の値）はサーバーだけが持ち、ブラウザには出さない
- 日記とキャラクターの読み書きは、すべて 1 つの置き場所（`src/features/cloud/repository.ts`）の関数を通す。どの関数も、最初の引数に「ログインしている人の ID」を取り、その人の行だけを読み書きする
- 「ログインしている人の ID」は、サーバーでログインの情報（Better Auth のセッション）から取り出す。ブラウザから送られてきた ID は使わない
- 表の作りでも守る。日記の表は「人の ID ＋ 日付」を主キーにし（1 日 1 件も DB で守る。AC-13）、どの行も人の ID を持つ。退会で人を消すと、その人のキャラクターと日記もいっしょに消える（外部キーの連鎖削除）

### 料金と上限（公式の情報、2026-11-11 時点）

- Neon の無料プラン：プロジェクト 100 個、1 つあたり 1GB、計算時間は月 100 時間（CU 時間）。5 分使われないと休み、次の問い合わせで数百ミリ秒以内に戻る
- Better Auth：アプリの中で動く部品なので、料金はかからない。ログインした人とセッションの情報は、Neon の DB に保存する

## 検討した他の案

| 案                                                           | 公式の情報で確かめたこと                                                                                                                                                                   | 採用しなかった理由                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase（DB と認証）                                        | 無料プランは 2 プロジェクト・500MB・月 5 万人。7 日ほど DB の利用が少ないと止まり、管理画面から手で戻す。Google の許可の画面に `<プロジェクト>.supabase.co` が出る（自分のドメインは有料） | 使う人が少ないポートフォリオでは止まりやすい。日記を預けるアプリとして、許可の画面に知らない名前が出るのを避けたい                                                 |
| Neon の Managed Better Auth（Neon Auth）                     | Neon が動かす Better Auth。利用者とセッションは自分の DB の `neon_auth` に入る。月 6 万人まで                                                                                              | ログインの戻り先がどこになるかを公式の情報で確かめられなかった。アプリの中で動かせば、設定とテストを手元で完結できる                                               |
| Auth.js（NextAuth）                                          | 今は Better Auth の一部になった。Next.js 用の v5 は試験版（`next-auth@beta`）として配られている                                                                                            | 引き継いだ先の Better Auth を直接使う方が、これからも保守されやすい                                                                                                |
| Drizzle ORM 1.0（試験版）                                    | 安定版は 0.45.4。1.0 は RC                                                                                                                                                                 | 試験版は変更が入りやすい。安定版を使い、1.0 が安定版になったら上げるかを検討する                                                                                   |
| ORM を使わずに SQL を直接書く                                | ―                                                                                                                                                                                          | 表と TypeScript の型を手でそろえる必要があり、間違えやすい                                                                                                         |
| DB の行ごとの決まり（RLS）を重ねて 2 重にする                | ―                                                                                                                                                                                          | サーバーからだけつなぐ形では、問い合わせのたびに「今の人」を DB に伝える仕組みが要り、つなぎ方が複雑になる。今回はサーバーの関数と表の作りで守り、テストで確かめる |
| テストの DB に Docker の PostgreSQL や Neon の枝分かれを使う | ―                                                                                                                                                                                          | 手元に Docker が要る、または CI に Neon の秘密の値を渡す必要がある。PGlite なら、どちらも要らない                                                                  |

## 結果・影響

- 秘密の値（DB のつなぎ先、Better Auth の秘密の鍵、Google の秘密の値）が初めて入る。Vercel の環境変数と手元の `.env.local`（Git に入れない）だけに置く。設定は Bolt-2 で行う
- Neon のアカウントとプロジェクト、Google 側のアプリの登録は、開発者が管理画面で行う（Bolt-2）
- 表を変えるときは drizzle-kit で SQL の変更（マイグレーション）を作り、リポジトリに残す。本番の DB への当て方は Bolt-2 で決める
- 「本人しか読み書きできない」ことは、PGlite を使った単体テストで、ほかの人の日記を読む・書き換える・消すができないことを確かめる（AC-29）
- Better Auth が Google から受け取って保存する情報（名前・メールアドレス・アイコンの URL、Google のトークンなど）は、Bolt-2 で公式の情報を確かめ、必要なものだけにする。説明ページ（Bolt-7）にも書く
- [ADR-0001](0001-tech-stack.md) の「ここでは決めないこと」の DB・認証は、この ADR で決めた

## 参考にした公式の情報

- Supabase Pricing：https://supabase.com/pricing ／ Project Pausing：https://supabase.com/docs/guides/platform/project-pausing ／ Login with Google：https://supabase.com/docs/guides/auth/social-login/auth-google ／ Custom SMTP：https://supabase.com/docs/guides/auth/auth-smtp
- Neon Pricing：https://neon.com/pricing ／ Regions：https://neon.com/docs/introduction/regions ／ Neon Auth：https://neon.com/docs/auth/overview
- Better Auth Installation：https://www.better-auth.com/docs/installation ／ Google：https://www.better-auth.com/docs/authentication/google
- Auth.js Installation：https://authjs.dev/getting-started/installation?framework=next.js
- Drizzle ORM Connect Neon：https://orm.drizzle.team/docs/connect-neon
- Vercel Configuring regions for Vercel Functions：https://vercel.com/docs/functions/configuring-functions/region（2026-08-11 更新）
- 部品の版とライセンス：npm の登録所（2026-11-11 に `npm view` で確認）

## 判断メモ

- 作成前に確認した点：A（Supabase）と B（Neon ＋ Better Auth）を、しばらく使われないとき・Google の許可の画面・守り方・作る量の 4 つの場面で比べ、B にした
- この ADR へのゲートでの判断：指摘なしで承認（DB の行ごとの決まり（RLS）は重ねず、サーバーの関数と表の作りで守ることも、このまま）
