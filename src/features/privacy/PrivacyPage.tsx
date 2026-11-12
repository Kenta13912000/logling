import type { ReactNode } from "react";

/** The day this page's content last changed. */
const UPDATED = "2026年11月12日";

const ISSUES_URL = "https://github.com/Kenta13912000/logling/issues";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-1 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

/**
 * How logling keeps diaries, in everyday words (AC-30). No technical terms
 * such as cloud, database or token: the tests check this.
 */
export function PrivacyPage() {
  // The top bar and the tabs come from the common layout (tab-navigation).
  return (
    <main className="px-4 pt-2 pb-10">
      <h1 className="mt-2 text-lg font-bold">日記の保存のしかた</h1>

      <Section title="ログインしないで使うとき">
        <p>
          キャラクターと日記は、いま使っているこのスマホや PC の中（Chrome や
          Safari などの中）だけにしまわれます。ほかの場所には送りません。
        </p>
      </Section>

      <Section title="ログインして使うとき">
        <p>
          キャラクターと日記は、インターネット上にある logling
          の保管場所にしまわれます。だから、スマホでも PC
          でも、同じアカウントでログインすれば続きが書けます。
        </p>
        <p>
          保管場所には、シンガポールにある会社のサービスを使っています。このスマホや
          PC の中には残しません。
        </p>
      </Section>

      <Section title="Google から受け取るもの">
        <p>
          Google からは、メールアドレスと、あなたの Google
          アカウントを見分けるための番号だけを受け取って残します。Google
          に登録している名前や写真は残しません。
        </p>
        <p>
          logling が、あなたの Gmail や Google フォトなど、Google
          のほかのサービスの中を見ることはできません。
        </p>
      </Section>

      <Section title="だれが読めるか">
        <p>
          あなたの日記を読めるのは、ログインしたあなただけです。ほかの人がのぞくことはできません。
        </p>
        <p>
          ただし、保管場所を管理している開発者は、しくみの上では中を見ることができます。不具合を調べるときなど、どうしても必要なとき以外は見ません。
        </p>
      </Section>

      <Section title="ログアウトと退会">
        <p>
          ログアウトすると、このスマホや PC
          からは日記が見えなくなります（保管場所には残っています）。
        </p>
        <p>
          退会すると、保管場所にあるキャラクターと日記が、すべて消えます。元にはもどせません。退会は、ログインしてから
          1 日以内にできます（本人かどうかを確かめるため）。
        </p>
      </Section>

      <Section title="Google でのログインの許可を取り消すには">
        <p>
          Google
          アカウントの「セキュリティ」→「サードパーティ製のアプリとサービス」から
          logling を選び、「アクセス権を削除」を押します。logling
          の退会とは別の操作です。
        </p>
      </Section>

      <Section title="問い合わせ">
        <p>
          <a
            href={ISSUES_URL}
            className="font-bold text-ember underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub の logling のページ（Issues）
          </a>
          から受け付けています。
        </p>
      </Section>

      <p className="mt-8 text-xs text-ink-muted">{`最終更新日：${UPDATED}`}</p>
    </main>
  );
}
