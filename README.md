# BeFree — フェーズ1(バックエンドAPI接続版)

BeFree_技術構成設計.md の「フェーズ1」に対応する実装です。UIロジックはプロトタイプ(Reactアーティファクト版)をほぼそのまま踏襲し、AI呼び出しとマッチング計算をすべて Next.js の API Routes 経由に差し替えています。ブラウザから `api.anthropic.com` を直接叩くことはありません。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local の ANTHROPIC_API_KEY に実際のキーを設定
npm run dev
```

`http://localhost:3000` を開くと、企業/人材どちらの立場で使うかを選ぶ画面が表示されます。

## GitHub + Vercelへのデプロイ

このリポジトリはローカルで `git init` 済みです。GitHub上に空のリポジトリを作成した後、以下でpushできます。

```bash
git remote add origin https://github.com/<your-org>/<your-repo>.git
git branch -M main
git push -u origin main
```

その後、[Vercel](https://vercel.com) で「Add New Project」からこのGitHubリポジトリをインポートしてください。Next.jsプロジェクトとして自動検出されます。

**重要**: デプロイ前に、Vercelのプロジェクト設定 → Environment Variables に `ANTHROPIC_API_KEY` を追加してください(`.env.local` はgit管理外のため、ここで別途設定する必要があります)。設定後に再デプロイすれば、AI対話・スキルマップ解析が本番環境でも動作します。

## ディレクトリ構成

```
app/
  page.jsx                      … UI本体(企業側4ステップ・人材側4ステップ)
  layout.jsx                    … ルートレイアウト
  api/
    diagnosis/start/route.js    … 企業側AI対話の開始
    diagnosis/answer/route.js   … 企業側AI対話の続き・最終スコアリング
    talent/analyze/route.js     … 人材側の職務経歴AI解析
    match/company/route.js      … 企業視点の人材マッチング
    match/talent/route.js       … 人材視点の企業マッチング
lib/
  axes.js                       … 共通10軸の定義
  matching.js                   … scoreMatch()(BeFree_マッチングロジック設計.md準拠)
  claude.js                     … サーバー専用のClaude API呼び出しヘルパー
  dialoguePrompts.js            … 企業側対話のプロンプト
  talentPrompts.js              … 人材側解析のプロンプト
  mockDb.js                     … 候補人材・候補企業のモックデータ(フェーズ2でDBに置き換え)
```

## 現状の制約(フェーズ1のスコープ)

- 診断の対話履歴はDBに保存せず、クライアント側で保持してリクエストごとに送り直す簡易方式(ステートレス)
- 候補人材・候補企業はモックデータ(`lib/mockDb.js`)。実際のユーザー登録・DB永続化はフェーズ2で対応
- 認証なし。企業アカウント/人材アカウントの区別は未実装

## 次のフェーズ

BeFree_技術構成設計.md の フェーズ2以降(PostgreSQLへのスキルマップ永続化、`engagements`/`engagement_outcomes` の実装、成長予測エンジンの土台づくり)を参照してください。
