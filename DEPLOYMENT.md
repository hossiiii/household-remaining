# デプロイメント設定

## 自動デプロイ

このプロジェクトは、`dev` ブランチへのマージ時に自動的にプロダクションにデプロイされます。

### GitHub Actions ワークフロー

`.github/workflows/deploy.yml` により以下の処理が自動実行されます：

1. **データベースマイグレーション**
   - `npx prisma migrate deploy` を実行
   - Supabase PostgreSQL データベースにスキーマ変更を適用

2. **シーダー実行** (必要時のみ)
   - `prisma/seed.ts` が存在する場合、`npm run db:seed` を実行
   - 初期データの投入

3. **Vercel デプロイ**
   - プロダクション環境へのアプリケーションデプロイ
   - 環境変数の自動設定

4. **Slack 通知**
   - デプロイ成功・失敗の通知

## 必要な環境変数設定

### GitHub Secrets

以下のシークレットを GitHub リポジトリに設定してください：

#### Vercel 関連
- `VERCEL_TOKEN`: Vercel API トークン
- `VERCEL_ORG_ID`: Vercel 組織 ID
- `VERCEL_PROJECT_ID`: Vercel プロジェクト ID

#### データベース関連
- `DATABASE_URL`: Supabase PostgreSQL 接続文字列

#### 認証関連
- `NEXTAUTH_SECRET`: NextAuth.js セッション暗号化キー
- `NEXTAUTH_URL`: アプリケーションのベース URL

#### 通知関連
- `SLACK_WEBHOOK_URL`: Slack Webhook URL (オプション)

### Vercel 環境変数

Vercel プロジェクトの設定で以下の環境変数を設定：

```
DATABASE_URL=your_supabase_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app.vercel.app
```

## 手動デプロイ

### データベース操作

```bash
# マイグレーション実行
npm run db:deploy

# シーダー実行
npm run db:seed

# データベースリセット (開発環境のみ)
npm run db:reset
```

### Vercel デプロイ

```bash
# Vercel CLI でデプロイ
npx vercel --prod
```

## トラブルシューティング

### マイグレーション失敗

1. Supabase ダッシュボードでデータベース状態を確認
2. 必要に応じて手動でマイグレーションを実行
3. GitHub Actions のログを確認

### デプロイ失敗

1. Vercel ダッシュボードでビルドログを確認
2. 環境変数の設定を確認
3.依存関係のバージョン競合をチェック

### 通知が来ない

1. Slack Webhook URL の設定を確認
2. GitHub Secrets の設定を確認