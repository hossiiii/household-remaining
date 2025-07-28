# 家計管理システム

Next.js 14 + Auth.js v5 + Prisma + PostgreSQLを使用した家計簿管理Webアプリケーションです。

## 機能概要

- **ユーザー認証**: メール・パスワードによるログイン/登録機能
- **取引管理**: 収入・支出の記録、編集、削除、フィルタリング
- **マスタデータ管理**: 支払い方法、カード情報、銀行情報の設定
- **ダッシュボード**: 収支の統計情報表示、最近の取引一覧
- **レスポンシブデザイン**: PCとモバイルデバイスに対応
- **データベースシード**: 初期データの投入機能

## 技術スタック

### フロントエンド
- **Next.js 14**: App Routerを使用
- **React 18**: サーバーコンポーネント・クライアントコンポーネント
- **TypeScript**: 厳格モードで型安全性を確保
- **Tailwind CSS**: ユーティリティファーストなスタイリング

### バックエンド
- **Next.js API Routes**: RESTful API
- **Auth.js v5**: 認証・セッション管理
- **Prisma ORM**: データベース操作とマイグレーション
- **PostgreSQL**: メインデータベース
- **bcryptjs**: パスワードハッシュ化

### バリデーション・ユーティリティ
- **Zod**: スキーマ検証
- **React Hook Form**: フォーム管理（フォームコンポーネント内で使用）

## プロジェクト構成

```
├── prisma/
│   ├── schema.prisma          # データベーススキーマ定義
│   └── seed.ts               # シードデータ
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # APIルート
│   │   ├── auth/            # 認証ページ
│   │   ├── dashboard/       # ダッシュボード
│   │   ├── transactions/    # 取引管理
│   │   ├── masters/        # マスタデータ管理
│   │   ├── layout.tsx      # ルートレイアウト
│   │   └── page.tsx        # ホームページ
│   ├── components/          # Reactコンポーネント
│   │   ├── auth/           # 認証関連
│   │   ├── transactions/   # 取引管理
│   │   ├── masters/        # マスタデータ
│   │   ├── layout/         # レイアウト
│   │   └── ui/             # UIコンポーネント
│   ├── lib/                # ライブラリ・ユーティリティ
│   │   ├── auth.ts         # Auth.js設定
│   │   ├── prisma.ts       # Prismaクライアント
│   │   ├── validations.ts  # Zodスキーマ
│   │   ├── utils.ts        # ユーティリティ関数
│   │   ├── transactions.ts # 取引サービス（サーバー側）
│   │   ├── transactions-client.ts # 取引サービス（クライアント側）
│   │   ├── masters.ts      # マスタサービス（サーバー側）
│   │   └── masters-client.ts # マスタサービス（クライアント側）
│   ├── types/              # TypeScript型定義
│   └── middleware.ts       # Next.jsミドルウェア（認証保護）
├── docker-compose.yml      # PostgreSQL開発環境
├── .env.example           # 環境変数テンプレート
└── package.json           # 依存関係・スクリプト
```

## セットアップ手順

### 1. 前提条件

- Node.js 18.0.0以上
- npm または yarn
- Docker（ローカルPostgreSQL用）

### 2. プロジェクトのクローン

```bash
git clone <repository-url>
cd household-expense-management
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

### 5. データベースの起動

Docker Composeを使用してPostgreSQLを起動：

```bash
docker-compose up -d
```

### 6. データベースのマイグレーション

```bash
npm run db:push
```

### 7. シードデータの投入

```bash
npm run db:seed
```

### 8. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## テストアカウント

シードデータで以下のテストアカウントが作成されます：

- **メールアドレス**: test@example.com
- **パスワード**: password123

## 使用方法

### 1. ログイン
- `/auth/signin` でログイン
- 新規登録は `/auth/signup`

### 2. ダッシュボード
- 収支の統計情報を確認
- 最近の取引を表示
- クイックアクションでよく使う機能にアクセス

### 3. 取引管理
- `/transactions` で取引の登録・編集・削除
- 日付、支払い方法、種別でフィルタリング可能
- ページネーション対応

### 4. マスタデータ管理
- `/masters` で支払い方法、カード、銀行情報を管理
- タブ切り替えで各種マスタデータを設定

## 開発用コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# リント
npm run lint

# 型チェック
npm run type-check

# データベース関連
npm run db:push      # スキーマをデータベースにプッシュ
npm run db:migrate   # マイグレーション実行
npm run db:seed      # シードデータ投入
npm run db:studio    # Prisma Studio起動
```

## デプロイ

### Vercel + Supabase での本番環境

1. **Supabaseプロジェクト作成**
   - https://supabase.com でプロジェクト作成
   - PostgreSQLの接続情報を取得

2. **環境変数設定**
   ```bash
   DATABASE_URL="postgresql://..."  # Supabase DB URL
   NEXTAUTH_SECRET="your-secret"
   NEXTAUTH_URL="https://your-domain.vercel.app"
   ```

3. **Vercelデプロイ**
   ```bash
   npm run build
   vercel --prod
   ```

4. **データベースマイグレーション**
   ```bash
   npm run db:deploy
   npm run db:seed
   ```

## トラブルシューティング

### データベース接続エラー
- `.env`ファイルの`DATABASE_URL`が正しく設定されているか確認
- PostgreSQLサービスが起動しているか確認

### 認証エラー
- `NEXTAUTH_SECRET`が設定されているか確認
- `NEXTAUTH_URL`が正しいURLになっているか確認

### ビルドエラー
- TypeScriptの型エラーがないか確認: `npm run type-check`
- リントエラーがないか確認: `npm run lint`

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。開発に参加される場合は、以下の手順に従ってください：

1. フォークする
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成
