# 要件定義：公開（release）

`feat/release` の `0415902` 時点の設定・テストと、公開版（https://logling.vercel.app）で確かめた結果から書き起こした、この機能が実際に満たしている要件。計画との比較は [gap-report.md](../aidlc/release/gap-report.md) にある。

## 概要

logling を Vercel の無料プラン（Hobby）で https://logling.vercel.app に公開した。GitHub と連携し、`main` を本番、PR ごとの変更を確認用として公開する。README の上のほうに公開の URL を載せた。

## 公開の構成

| 項目                | 内容                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 公開先              | Vercel（Hobby・無料）。チーム名は GitHub のユーザー名                                                                                      |
| 本番の URL          | https://logling.vercel.app                                                                                                                 |
| GitHub との連携     | Vercel の GitHub アプリに、logling のリポジトリだけへのアクセスを許可                                                                      |
| ビルド              | Vercel が Next.js を自動で認識。`vercel.json` は使わない。環境変数（秘密の値）は使わない                                                   |
| Node.js             | `package.json` の `engines.node` を `^24.22.1` にし、手元・CI と同じ Node 24 でビルドする（`.nvmrc` と一致することを単体テストで確かめる） |
| 確認用の URL の保護 | Deployment Protection：Standard Protection（Vercel Authentication）。本番の URL だけを公開する                                             |
| アクセス解析        | Web Analytics・Speed Insights は有効にしていない                                                                                           |
| 選定理由            | [ADR-0003](../adr/0003-hosting-vercel.md)                                                                                                  |

## 配信の設定（`next.config.ts`）

すべてのページの応答に、次の 4 つのヘッダーを付ける。

| ヘッダー                  | 値                                |
| ------------------------- | --------------------------------- |
| `Content-Security-Policy` | `frame-ancestors 'none'`          |
| `X-Frame-Options`         | `DENY`                            |
| `X-Content-Type-Options`  | `nosniff`                         |
| `Referrer-Policy`         | `strict-origin-when-cross-origin` |

- HTTPS への切り替え（`http://` → 308 で `https://`）と `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` は Vercel が付ける

## 公開版の確かめ方

- E2E テストは、環境変数 `BASE_URL` を付けると公開版に向けて実行できる（`playwright.config.ts`。付けたときは手元の開発サーバーを起動しない）
- 例：`$env:BASE_URL = "https://logling.vercel.app"; npm run test:e2e`
- `e2e/release.spec.ts`：同じオリジン以外への通信がなく、日記の本文を送らないこと（AC-8）／読み込むスクリプトがすべて同じオリジンから（AC-9）／4 つのヘッダー（AC-10）
- `e2e/diary-exp.spec.ts`：公開版でも、名前 → 確認 → 日記 → 経験値までの操作などが動く（AC-1, AC-2）

## README

- タイトルと CI バッジのすぐ下に「試してみる：https://logling.vercel.app」と、日記はブラウザの中だけに保存されることを載せた（最初の 10 行に URL があることを単体テストで確かめる）
- 技術スタックの表に「公開先：Vercel（Hobby）」と ADR-0003 へのリンクを加えた

## 取り込む前に確かめた結果（2026-11-05）

| 確かめたこと                                      | 結果                                                                                       | AC                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------- |
| 公開版での E2E（`diary-exp` の 5 件、AC-8・AC-9） | 成功                                                                                       | AC-1, AC-2, AC-8, AC-9 |
| 実物のスマホ                                      | 名前 → 確認 → 日記 → 経験値まで使えた                                                      | AC-2                   |
| `http://` で開く                                  | HTTPS に切り替わる                                                                         | AC-3                   |
| Deployment Protection の設定                      | Standard Protection（Vercel Authentication）                                               | AC-7（設定）           |
| 履歴の秘密情報                                    | なし。個人のメールアドレスもなし                                                           | AC-12（確認）          |
| ビルドに失敗したとき                              | 本番の公開が成功したときだけ本番の URL が切り替わる（Vercel の公式ドキュメント。ADR-0003） | AC-5                   |

## 取り込みの前後でまだ確かめていないこと

| 確かめること                                                     | 時期            | AC          |
| ---------------------------------------------------------------- | --------------- | ----------- |
| PR のページに確認用の URL が出る。ログインしていないと見られない | PR を作ったあと | AC-6, AC-7  |
| 確認用の URL で、4 つのヘッダーと Node 24 でのビルド             | PR を作ったあと | AC-10       |
| 取り込むと本番が自動で更新され、E2E 全 8 件が通る                | 取り込んだあと  | AC-4, AC-10 |
| リポジトリの公開と Dependabot の有効化                           | 取り込んだあと  | AC-12       |

## 判断メモ

- ⑧ のゲートでの判断：差分レポートの対応（PR と取り込みで確かめる AC は、この PR の中で確かめる）を反映した内容で承認
