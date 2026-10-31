# ADR-0003：公開先に Vercel の無料プラン（Hobby）を使う

- 日付：2026-10-31
- 状態：採用

## 背景

logling を、採用担当者や日記を続けたい人が URL を開くだけで試せるように公開する（`release` の Intent）。条件は次のとおり。

- Next.js 16（App Router）で作ったアプリを、そのまま動かせる
- `main` に取り込むと自動で公開され、PR ごとに確認用の URL ができる（SC-2・SC-3）
- 個人のポートフォリオなので、無料で使える
- 日記を外部に送らない方針（SC-4）を崩さない。アクセス解析などを勝手に入れない
- アプリはサーバーの秘密情報も DB も持たない（データはブラウザの localStorage。ADR-0002）

## 決定

**Vercel の無料プラン（Hobby）** で公開する。GitHub と連携し、`main` を本番、PR を確認用の公開にする。URL は無料の `〜.vercel.app` を使う。

公式の情報で確かめた条件（2026-10-31 時点）：

- Hobby は無料で、「個人的な、商用でない利用に限る」。個人のポートフォリオは当てはまる
- 月あたりの上限：通信量 100GB、CDN へのリクエスト 100 万回、1 日の公開回数 100 回。logling の規模では十分
- Deployment Protection の **Standard Protection** は無料プランでも使え、本番の URL 以外（PR ごとの確認用の URL など）を Vercel にログインした本人だけに見せられる
- Node.js は 26.x（標準）・24.x・22.x が使える。`package.json` の `engines.node` が「以上」の指定（例：`>=22.0.0`）だと最新の 26.x が使われるため、手元・CI と合わせて `^24.22.1` を指定する

## 検討した他の案

| 案                          | 公式の情報で確かめたこと（2026-10-31 時点）                                                                                                           | 採用しなかった理由                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Netlify（無料プラン）       | 月 300 クレジットの上限制。本番の公開 1 回で 15 クレジット、通信量は 1GB で 20 クレジット。PR ごとの公開は 0 クレジット。上限に達すると翌月まで止まる | Next.js は動くが、公開のたびにクレジットを使い、回数を気にする必要がある         |
| Cloudflare Workers（無料）  | Next.js は変換のアダプター（OpenNext、新しいアプリには vinext を推奨）が必要。無料プランは 1 つの Worker が圧縮後 3MiB まで                           | 追加の設定と、Next.js の新しい機能への対応を確かめる手間がかかる                 |
| AWS Amplify・Cloud Run など | （CLAUDE.md の候補。今回は詳しく調べていない）                                                                                                        | クラウドの経験を見せたいときの選択肢だが、手間と費用が増える。今回の目的には過剰 |

## 結果・影響

- `main` に取り込むだけで公開でき、PR ごとに確認用の URL ができる。Next.js を作っている会社のサービスなので、設定がほとんどいらない
- 本番の URL は誰でも見られる。PR ごとの確認用の URL は本人だけが見られる（Standard Protection）
- Web Analytics・Speed Insights は有効にしない（日記を扱うアプリとして、利用者の情報を集めない）
- 無料プランの条件は変わることがある。商用で使う場合や上限を超える場合は、プランを見直す
- Vercel の GitHub アプリには、logling のリポジトリだけへのアクセスを許可する

## 参考にした公式の情報

- Vercel Hobby Plan：https://vercel.com/docs/plans/hobby（2026-09-14 更新）
- Vercel Deployment Protection：https://vercel.com/docs/deployment-protection（2026-09-15 更新）
- Vercel Supported Node.js versions：https://vercel.com/docs/functions/runtimes/node-js/node-js-versions（2026-02-27 更新）
- Netlify Pricing：https://www.netlify.com/pricing/ ／ Credit-based pricing plans：https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- Cloudflare Workers の Next.js・OpenNext のガイド：https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ ／ https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/

## 判断メモ

- 作成前に確認した点：URL は Vercel の無料のもの／比べる相手（Netlify・Cloudflare）も公式の情報を調べる
- ADR へのゲートでの判断：指摘なしで承認
