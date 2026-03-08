# 百人ゴロ丸 Cloudflare 移行計画

## 1. 移行元プロジェクト分析サマリー

### アプリ概要
百人一首をゴロ（語呂合わせ）で覚える学習 Web アプリ。学習・テスト・バトル・実践（リスニング）・復習モードを搭載。

### 現在の技術スタック

| 用途 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Next.js 16.0.7 (App Router) | |
| UI | React 19 + Tailwind CSS 3.4 + DaisyUI 4 | → v4 + DaisyUI 5にアップグレード |
| 認証 | Supabase Auth | メール/パスワード |
| DB | Neon PostgreSQL (serverless) | `@neondatabase/serverless` |
| 音声 | Howler.js | クライアントサイドのみ |
| 音声ストレージ | Cloudflare R2 | 既に移行済み |
| ホスティング | 未定（ローカル開発のみ） | |

### データベース構成（Neon PostgreSQL）

**テーブル 3 つ:**

1. **`poems`**（100行）— 百首の歌データ + 音声URL + ゴロ情報
   - id, kami, shimo, kami_hiragana, shimo_hiragana, kami_tts, shimo_tts
   - kami_goro, shimo_goro, kami_goro_tts, shimo_goro_tts, goro_kaisetsu
   - kami_audio_url, shimo_audio_url, kami_goro_audio_url, shimo_goro_audio_url

2. **`user_test_clears`** — テストクリア状況
   - id (SERIAL), user_id (UUID), test_type, range, cleared_at
   - UNIQUE(user_id, test_type, range)

3. **`user_test_best_scores`** — ベストスコア
   - user_id (UUID), test_key, best_score, updated_at
   - PRIMARY KEY(user_id, test_key)

### API ルート（5 エンドポイント）

| エンドポイント | メソッド | 認証 | 機能 |
|-------------|---------|------|------|
| `/api/poems` | GET | 不要 | 歌データ取得（range 指定可） |
| `/api/test-clears` | GET | 任意 | クリア状況取得 |
| `/api/test-clears` | POST | 必須 | クリア状況保存 |
| `/api/test-best-scores` | GET | 任意 | ベストスコア取得 |
| `/api/test-best-scores` | POST | 必須 | ベストスコア保存 |

### 認証フロー
- Supabase Auth（`@supabase/supabase-js` + `@supabase/ssr`）
- `/login` — メール+パスワードログイン
- `/register` — 新規登録（name, email, password）
- Cookie ベースのセッション管理
- 未ログインでも学習機能は使える（進捗保存だけ不可）

### クライアントサイドストレージ
- `localStorage`: 復習リスト、ベストスコア（ローカルバックアップ）

---

## 2. 移行方針

### 2-1. 変更が必要なもの

| 移行前 | 移行後 | 理由 |
|--------|--------|------|
| Supabase Auth | JWT 自前実装（PBKDF2 + HMAC-SHA256） | Supabase SDK は Cloudflare Workers 非対応 |
| Neon PostgreSQL | Cloudflare D1（SQLite） | `@neondatabase/serverless` は TCP 必要 |
| `@neondatabase/serverless` | `getCloudflareContext().env.DB` | D1 バインディング経由 |
| `.env.local` のみ | `.env.local` + `.dev.vars` | wrangler dev は `.dev.vars` を参照 |

### 2-2. 変更不要なもの（そのまま使える）

| 技術 | 理由 |
|------|------|
| Howler.js | クライアントサイドのみ。Workers に影響なし |
| Cloudflare R2 音声ファイル | 既に移行済み。URL もそのまま |
| Tailwind CSS + DaisyUI | CSS フレームワークは影響なし |
| localStorage 周り | クライアントサイドのみ |
| QuizCard / Header / Footer コンポーネント | UIコンポーネントは変更不要 |
| goro-timings.ts / tricky-questions.ts | 静的データファイルはそのまま |
| ページルーティング構成 | App Router のルート構成は維持 |

### 2-3. Tailwind CSS / DaisyUI のバージョン（確定）

元プロジェクトは **Tailwind 3.4 + DaisyUI 4** を使用。
移行先では **Tailwind v4 + DaisyUI 5** にアップグレードする（ouchi-zaiko-cloudflare と統一）。

> DaisyUI 4 → 5 でクラス名変更がある箇所は移植時に対応する。

---

## 3. D1 スキーマ設計

PostgreSQL → SQLite への変換が必要。

### poems テーブル

```sql
CREATE TABLE poems (
  id INTEGER PRIMARY KEY,
  kami TEXT NOT NULL,
  shimo TEXT NOT NULL,
  kami_hiragana TEXT NOT NULL,
  shimo_hiragana TEXT NOT NULL,
  kami_tts TEXT,
  shimo_tts TEXT,
  kami_goro TEXT,
  shimo_goro TEXT,
  kami_goro_tts TEXT,
  shimo_goro_tts TEXT,
  goro_kaisetsu TEXT,
  kami_audio_url TEXT,
  shimo_audio_url TEXT,
  kami_goro_audio_url TEXT,
  shimo_goro_audio_url TEXT
);
```

### users テーブル（新規：Supabase Auth の代替）

```sql
CREATE TABLE users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### user_test_clears テーブル

```sql
CREATE TABLE user_test_clears (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  test_type TEXT NOT NULL,
  range TEXT NOT NULL,
  cleared_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, test_type, range)
);
```

### user_test_best_scores テーブル

```sql
CREATE TABLE user_test_best_scores (
  user_id TEXT NOT NULL,
  test_key TEXT NOT NULL,
  best_score INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, test_key)
);
```

### データ移行（確定）

- **poems テーブル**: Neon から 100 行を `SELECT * FROM poems` → INSERT 文で D1 へ投入
  - Neon への接続は可能。エクスポートスクリプトで SQL ダンプを作成し、ローカル/リモート D1 に適用する
- **users テーブル**: 新規作成。既存ユーザーは再登録（新規登録で問題なし）
- **user_test_clears / user_test_best_scores**: 既存データの移行は不要（新規スタート）

---

## 4. 認証の移行設計

### Supabase Auth → JWT 自前実装

| Supabase Auth | Cloudflare 実装 |
|---------------|----------------|
| `supabase.auth.signInWithPassword()` | `POST /api/auth/login` |
| `supabase.auth.signUp()` | `POST /api/auth/register` |
| `supabase.auth.signOut()` | `POST /api/auth/logout` |
| `supabase.auth.getUser()` | `GET /api/auth/me` |
| `@supabase/ssr` Cookie 管理 | 自前 HttpOnly Cookie + JWT |

### 新規 API ルート（認証系）

| エンドポイント | メソッド | 機能 |
|-------------|---------|------|
| `/api/auth/register` | POST | ユーザー登録（PBKDF2 ハッシュ保存） |
| `/api/auth/login` | POST | ログイン（JWT 発行 → HttpOnly Cookie） |
| `/api/auth/logout` | POST | ログアウト（Cookie 削除） |
| `/api/auth/me` | GET | 認証状態確認 |

### 認証関連の新規ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/password.ts` | PBKDF2 ハッシュ / 検証 |
| `src/lib/auth.ts` | JWT 署名 / 検証 / Cookie 管理 |
| `src/context/AuthContext.tsx` | クライアント認証状態管理 |
| `src/middleware.ts` | ルート保護（認証チェック） |

### 認証の動作方針
- **未ログインでも学習機能は使える**（元アプリと同じ）
- ログイン必須なのは「クリア保存」「ベストスコア保存」のみ
- middleware は `/login`, `/register`, `/api/auth/*`, `/api/poems` をパブリックにする
- それ以外の API（POST系）は認証必須

---

## 5. 作業手順（フェーズ分け）

### Phase 1: プロジェクト基盤セットアップ
1. Next.js プロジェクト初期化
2. `wrangler.toml` 作成（D1 バインディング設定）
3. `@opennextjs/cloudflare` + wrangler インストール
4. Tailwind CSS + DaisyUI セットアップ
5. `src/env.d.ts` 型定義作成
6. package.json スクリプト設定（dev / build / cf:build / preview / deploy）
7. D1 データベース作成（`wrangler d1 create`）
8. スキーマ SQL 作成 → ローカル D1 に適用

### Phase 2: 認証機能
1. `src/lib/password.ts`（PBKDF2）
2. `src/lib/auth.ts`（JWT）
3. `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
4. `src/context/AuthContext.tsx`
5. `src/middleware.ts`
6. `/login`, `/register` ページ

### Phase 3: データベース層 + API
1. `src/lib/db.ts`（D1 アクセスヘルパー）
2. `/api/poems` → D1 版に書き換え
3. `/api/test-clears` → D1 版に書き換え
4. `/api/test-best-scores` → D1 版に書き換え
5. poems データの D1 投入（Neon からエクスポート → D1 インポート）

### Phase 4: フロントエンド移植
1. 型定義（`src/types/poem.ts`）
2. 共通コンポーネント（Header, Footer, QuizCard）
3. 静的データ（goro-timings.ts, tricky-questions.ts）
4. ユーティリティ関数（lib/配下）
5. 音声関連（audio.ts, useGoroPlayback.ts, useKamiAudio.ts）
6. ページ移植（ホーム → 学習 → テスト → バトル → 実践 → 復習）
7. 認証関連のフックを AuthContext に置き換え

### Phase 5: テスト・デプロイ
1. `next dev` で UI 動作確認
2. `wrangler dev` (preview) で Cloudflare 環境の動作確認
3. D1 リモートにスキーマ + poems データ適用
4. `wrangler deploy` で本番デプロイ
5. R2 の CORS 設定に本番ドメインを追加

---

## 6. 注意点・リスク

### 技術的リスク

| リスク | 対策 |
|--------|------|
| Howler.js が SSR でエラー | クライアントコンポーネント (`"use client"`) 内でのみ使用。動的 import で対応 |
| DaisyUI 4 → 5のクラス名変更 | 移行時にクラス名を確認し対応する |
| poems データ量（100行×16列） | INSERT 文で問題なし。JSON → SQL 変換スクリプトで対応 |
| R2 CORS 設定 | 既存の設定に本番ドメインを追加するだけ |
| localStorage と D1 の同期 | 元アプリの仕組み（ローカルバックアップ）をそのまま維持 |

### 移行しないもの（不要な機能）

- **PWA 対応**: 元アプリにも PWA はないため、対応不要
- **Jest テスト**: 移行対象外（必要に応じて後から追加）
- **poems-1-4.json フォールバック**: D1 はローカル/リモート両方で安定しているため不要

---

## 7. ファイル構成（予定）

```
hyakunin-goromaru-cloudflare/
├── db/
│   ├── schema.sql              # D1 スキーマ定義
│   └── seed-poems.sql          # poems データ投入用
├── public/
│   ├── favicon.png
│   └── hand.png
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── poems/route.ts
│   │   │   ├── test-clears/route.ts
│   │   │   └── test-best-scores/route.ts
│   │   ├── (main)/
│   │   │   ├── battle/
│   │   │   ├── jissen/
│   │   │   ├── learn/
│   │   │   ├── review/
│   │   │   └── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── QuizCard.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── data/
│   │   ├── goro-timings.ts
│   │   └── tricky-questions.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── password.ts
│   │   ├── db.ts
│   │   ├── audio.ts
│   │   ├── blockUtils.ts
│   │   ├── formatLines.ts
│   │   ├── goro.ts
│   │   ├── range.ts
│   │   ├── reviewStorage.ts
│   │   ├── testBestScore.ts
│   │   ├── useGoroPlayback.ts
│   │   ├── useKamiAudio.ts
│   │   ├── useTestBestScores.ts
│   │   └── useTestResultSave.ts
│   ├── types/
│   │   └── poem.ts
│   ├── env.d.ts
│   └── middleware.ts
├── .dev.vars                   # wrangler 用環境変数（gitignore）
├── .env.local                  # next dev 用環境変数（gitignore）
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts (or CSS import)
├── tsconfig.json
└── wrangler.toml
```

---

## 8. 環境変数

### 必要な環境変数

| 変数名 | 用途 | 管理場所 |
|--------|------|---------|
| `JWT_SECRET` | JWT 署名用シークレット | `.env.local` / `.dev.vars` / wrangler secret |
| `NEXT_PUBLIC_AUDIO_VERSION` | 音声キャッシュバスト | `.env.local` / `.dev.vars` |

### 不要になる環境変数

| 変数名 | 理由 |
|--------|------|
| `DATABASE_URL` | D1 バインディングに置き換え |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 不使用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 不使用 |

---

## 9. 削除する依存パッケージ

| パッケージ | 理由 |
|-----------|------|
| `@supabase/supabase-js` | 自前認証に置き換え |
| `@supabase/ssr` | 自前 Cookie 管理に置き換え |
| `@neondatabase/serverless` | D1 に置き換え |
| `pg` | D1 に置き換え |

### 追加する依存パッケージ

| パッケージ | 理由 |
|-----------|------|
| `@opennextjs/cloudflare` | Cloudflare Workers 向けビルド |
| `wrangler` | Cloudflare 開発・デプロイ CLI |
| `@cloudflare/workers-types` | D1/KV 等の型定義 |
