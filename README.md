# 百人ゴロ丸（Cloudflare版）

百人一首をゴロ合わせで覚える学習アプリです。

## 機能

- 4首/8首/20首/100首の段階的なテスト
- 上の句・下の句の音声再生
- ゴロ合わせの音声再生・解説
- 間違えやすい問題の特訓
- コンピューター対戦
- 実践問題
- 復習リスト
- テストクリア状況の記録
- PWA対応（スマホにインストール可能）

## 技術スタック

- Next.js 15（App Router）
- TypeScript / React
- Tailwind CSS v4 + DaisyUI 5
- Cloudflare Workers（@opennextjs/cloudflare）
- Cloudflare D1（SQLite）
- Cloudflare R2（音声ファイル配信）
- JWT認証（自前実装）
- Howler.js（音声再生）

## セットアップ

```bash
npm install
```

### 環境変数

`.dev.vars` を作成し、以下を設定：

```
JWT_SECRET=your-secret-key
```

### D1データベース

```bash
# ローカル
npx wrangler d1 execute hyakunin-goromaru-db --local --file db/schema.sql

# リモート
npx wrangler d1 execute hyakunin-goromaru-db --remote --file db/schema.sql
```

### 開発

```bash
# Next.js開発サーバー
npm run dev

# Cloudflare Workers ローカル
npm run cf:build && wrangler dev
```

### デプロイ

```bash
npm run deploy
```
