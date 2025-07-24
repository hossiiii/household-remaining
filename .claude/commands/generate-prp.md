# Create PRP

## Usage
- Single argument: `/generate-prp feature_file.md` (uses current directory)
- Two arguments: `/generate-prp feature_file.md /path/to/development/directory`

## Feature file: $1
## Development path: ${2:-$(pwd)}

徹底的な調査を含む完全なPRPを汎用機能実装用に生成します。AIエージェントが自己検証と反復的な改良を可能にするために、コンテキストを確実に渡してください。まず機能ファイルを読んで、何を作成す
る必要があるか、提供された例がどのように役立つか、その他の考慮事項を理解してください。

**開発パス**: 指定されたパス（${2:-$(pwd)}）で作業を行います。

AIエージェントは、PRPに追加するコンテキストとトレーニングデータのみを取得します。AIエージェントはコードベースへのアクセスと同じ知識カットオフを持っていると仮定してください。そのため、調査
結果をPRPに含めるか参照することが重要です。エージェントはWebsearch機能を持っているので、ドキュメントと例のURLを渡してください。

## Research Process

1. **Codebase Analysis**
   - コードベース内の類似機能/パターンを検索
   - PRPで参照するファイルを特定
   - 従うべき既存の規約をメモ
   - 検証アプローチのためのテストパターンをチェック

2. **External Research**
   - オンラインで類似機能/パターンを検索
   - ライブラリドキュメント（特定のURLを含める）
   - 実装例（GitHub/StackOverflow/ブログ）
   - ベストプラクティスとよくある落とし穴

3. **User Clarification** (if needed)
   - ミラーリングする特定のパターンとその場所は？
   - 統合要件とその場所は？

## PRP Generation

`PRPs/templates/prp_base.md`をテンプレートとして使用：

### Critical Context to Include and pass to the AI agent as part of the PRP
- **Documentation**: 特定のセクションを含むURL
- **Code Examples**: コードベースからの実際のスニペット
- **Gotchas**: ライブラリの癖、バージョン問題
- **Patterns**: 従うべき既存のアプローチ

### Implementation Blueprint
- アプローチを示す疑似コードから開始
- パターンのために実際のファイルを参照
- エラーハンドリング戦略を含める
- PRPを完了するために完了すべきタスクを、実行すべき順序でリスト化

### Validation Gates (Must be Executable) eg for python
```bash
# Syntax/Style
ruff check --fix && mypy .

# Unit Tests
uv run pytest tests/ -v
```

*** 重要：調査とコードベースの探索が終わってPRPを書き始める前に ***

*** PRPについてULTRATHINKしてアプローチを計画してからPRPを書き始めてください ***


## Output

保存先: `PRPs/{feature-name}.md`

## Quality Checklist
- [ ] 必要なすべてのコンテキストが含まれている
- [ ] 検証ゲートがAIによって実行可能
- [ ] 既存のパターンを参照している
- [ ] 明確な実装パス
- [ ] エラーハンドリングが文書化されている

PRPを1-10のスケールで評価（claude codesを使用してワンパス実装で成功する信頼度レベル）

覚えておいてください：目標は包括的なコンテキストによるワンパス実装の成功です。