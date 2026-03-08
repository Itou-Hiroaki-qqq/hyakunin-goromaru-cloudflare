# hyakunin-goromaru-cloudflare

## プロジェクト概要
百人一首ゴロ合わせ学習アプリの Cloudflare Workers 版。元プロジェクト（hyakunin-goromaru）から移行完了。

## 技術スタック
- Next.js 15 (App Router) + React + TypeScript
- Tailwind CSS v4 + DaisyUI 5
- Cloudflare Workers (@opennextjs/cloudflare)
- Cloudflare D1 (SQLite)
- JWT 自前実装 (PBKDF2 + HMAC-SHA256)
- Howler.js (音声再生、html5モード)
- Cloudflare R2 (音声ファイル、公開バケット)
- PWA対応済み

## 本番URL
- https://hyakunin-goromaru.chiteijin315.workers.dev

## D1 情報
- database_name: hyakunin-goromaru-db
- database_id: 0bcd82c1-f691-490b-ba76-0a671c33a759
- スキーマ: db/schema.sql（poems, users, user_test_clears, user_test_best_scores）
- 注意: `range` は予約語のため `range_key` カラム名に変更済み

## 全フェーズ完了
- [x] Phase 1: プロジェクト基盤セットアップ
- [x] Phase 2: 認証機能
- [x] Phase 3: DB層 + API
- [x] Phase 4: フロントエンド移植
- [x] Phase 5: デプロイ・動作確認完了

## Cloudflare固有の注意点
- `.open-next` ロックエラー → ターミナル閉じて `rm -rf .open-next` で解決
- R2 CORS設定に workers.dev ドメインを追加必須
- Howler.js は `html5: true` 必須（R2 CDNキャッシュのCORS問題回避）
- `next/image` は `unoptimized` プロパティ必須（/_next/image が動かない）
- auth.ts の crypto.subtle.verify で `.buffer as ArrayBuffer` キャスト必要
- SQLiteにGREATEST関数なし → MAXで代替

## PWA設定
- manifest.json: public/manifest.json
- アプリ名: 百人一首C-ゴロでマル覚え-
- アイコン: favicon.png (1024x1024)
