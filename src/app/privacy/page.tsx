import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | 百人一首 ゴロでマル覚え",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", fontFamily: "sans-serif", color: "#333", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>プライバシーポリシー</h1>
      <p style={{ marginBottom: 8, color: "#666", fontSize: 14 }}>最終更新日: 2026年3月19日</p>
      <p style={{ marginBottom: 24 }}>
        本プライバシーポリシーは、「百人一首 ゴロでマル覚え」（以下「本アプリ」）における
        ユーザー情報の取り扱いについて説明するものです。
      </p>

      <Section title="1. 収集する情報">
        <p>本アプリでは、以下の情報を収集します。</p>
        <SubSection title="(a) ユーザーが提供する情報">
          <ul>
            <li>ニックネーム（表示名）</li>
            <li>メールアドレス</li>
            <li>パスワード（暗号化して保存）</li>
          </ul>
        </SubSection>
        <SubSection title="(b) 自動的に収集される情報">
          <ul>
            <li>テストクリア履歴（どの範囲のテストをクリアしたか）</li>
            <li>テストのベストスコア</li>
          </ul>
        </SubSection>
        <SubSection title="(c) 端末内にのみ保存される情報">
          <ul>
            <li>復習データ（間違えた問題の記録） - サーバーには送信されません</li>
            <li>音声ファイルのキャッシュ - サーバーには送信されません</li>
          </ul>
        </SubSection>
      </Section>

      <Section title="2. 情報の利用目的">
        <p>収集した情報は、以下の目的にのみ利用します。</p>
        <ul>
          <li>ユーザー認証（ログイン・ログアウト）</li>
          <li>学習進捗の保存・表示</li>
          <li>テスト結果の記録・ランキング表示</li>
        </ul>
      </Section>

      <Section title="3. 情報の第三者提供">
        <p>
          本アプリは、ユーザーの個人情報を第三者に提供・販売・共有することはありません。
          広告SDK・アナリティクスSDK等の第三者サービスは使用していません。
        </p>
      </Section>

      <Section title="4. 情報の保管とセキュリティ">
        <ul>
          <li>パスワードはPBKDF2方式で暗号化（ハッシュ化）して保存しており、平文では保存していません</li>
          <li>認証トークン（JWT）はお使いの端末内の安全な領域（Android Keystore）に保存されます</li>
          <li>サーバーとの通信はすべてHTTPS（暗号化通信）で行われます</li>
          <li>サーバーデータはCloudflare, Inc.のインフラストラクチャ上に保管されます</li>
        </ul>
      </Section>

      <Section title="5. アカウントの削除">
        <p>
          ユーザーはアプリ内のホーム画面から、いつでもアカウントを削除できます。
          アカウントを削除すると、以下のデータがすべて完全に削除されます。
        </p>
        <ul>
          <li>ユーザー情報（ニックネーム、メールアドレス、パスワード）</li>
          <li>テストクリア履歴</li>
          <li>ベストスコア</li>
        </ul>
        <p>削除されたデータを復元することはできません。</p>
      </Section>

      <Section title="6. お子様のプライバシー">
        <p>
          本アプリは13歳未満のお子様を対象としていません。
          13歳未満のお子様から意図的に個人情報を収集することはありません。
        </p>
      </Section>

      <Section title="7. プライバシーポリシーの変更">
        <p>
          本ポリシーは必要に応じて更新されることがあります。
          重要な変更がある場合は、アプリ内でお知らせします。
        </p>
      </Section>

      <Section title="8. お問い合わせ">
        <p>
          本ポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください。
        </p>
        <p style={{ fontWeight: "bold" }}>chiteijin315@gmail.com</p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, borderBottom: "1px solid #e5e7eb", paddingBottom: 8 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, marginLeft: 8 }}>
      <h3 style={{ fontSize: 15, fontWeight: "600", marginBottom: 4 }}>{title}</h3>
      {children}
    </div>
  );
}
