// prisma/seed.cjs(ローカル/ターミナルからの実行用)と、
// app/api/setup/route.js(ブラウザだけでセットアップを完了させるための本番用エンドポイント)の
// 両方から参照する共通データ。

export const TALENT_SEED = [
  {
    name: "宮崎 大輔",
    title: "元人事責任者 / シリーズA〜B 3社経験",
    years: "15年以上",
    bio: "急成長期の採用基準設計とオンボーディング整備を3社で主導。組織図が『人ありき』になっている状態からの立て直しが専門領域です。",
    axisScores: { product: 8, sales: 10, marketing: 7, hr: 29, finance_raise: 6, finance_mgmt: 12, cs: 14, ops: 19, tech: 5, leadership: 22 },
    phases: ["シリーズA", "シリーズB"],
    bottlenecks: ["採用・組織", "経営体制", "オペレーション"],
  },
  {
    name: "小池 美咲",
    title: "元CFO室 / 管理会計・資金調達支援",
    years: "15年以上",
    bio: "月次早期化と資金繰り管理のダッシュボード構築を得意とし、着地が見えない状態から週次で着地を追える体制への移行を複数社で実施。",
    axisScores: { product: 9, sales: 6, marketing: 5, hr: 10, finance_raise: 24, finance_mgmt: 29, cs: 8, ops: 15, tech: 7, leadership: 18 },
    phases: ["シリーズA", "シリーズB以降"],
    bottlenecks: ["財務・管理会計", "資金調達", "経営体制"],
  },
  {
    name: "遠藤 慧",
    title: "元セールスイネーブルメント責任者",
    years: "10〜15年",
    bio: "属人化した営業プロセスの型化と初期セールスチームの立ち上げ経験が豊富。個人商店化した営業からの脱却を支援します。",
    axisScores: { product: 13, sales: 27, marketing: 18, hr: 9, finance_raise: 7, finance_mgmt: 6, cs: 20, ops: 14, tech: 8, leadership: 12 },
    phases: ["シード", "プレシリーズA", "シリーズA"],
    bottlenecks: ["セールス基盤", "マーケティング", "カスタマーサクセス"],
  },
];

export const COMPANY_SEED = [
  {
    name: "株式会社ノーステック",
    industry: "SaaS / 業務効率化",
    headcount: "11〜30名",
    phase: "シリーズA",
    revenue: "1〜3億円",
    axisScores: { product: 72, sales: 34, marketing: 48, hr: 29, finance_raise: 61, finance_mgmt: 22, cs: 55, ops: 44, tech: 68, leadership: 58 },
    summary: "直近3ヶ月で採用基準が社内で揃わず、面接官ごとに評価がぶれている状態。",
  },
  {
    name: "株式会社ハレノ",
    industry: "ヘルスケア",
    headcount: "31〜50名",
    phase: "シリーズB以降",
    revenue: "3〜10億円",
    axisScores: { product: 65, sales: 52, marketing: 58, hr: 46, finance_raise: 55, finance_mgmt: 49, cs: 61, ops: 38, tech: 60, leadership: 24 },
    summary: "急拡大に伴いミドルマネジメント層が不在で、経営陣に意思決定が集中している状態。",
  },
  {
    name: "合同会社ミライバ",
    industry: "D2C / EC",
    headcount: "11〜30名",
    phase: "プレシリーズA",
    revenue: "〜1億円",
    axisScores: { product: 58, sales: 41, marketing: 44, hr: 39, finance_raise: 47, finance_mgmt: 36, cs: 40, ops: 21, tech: 33, leadership: 45 },
    summary: "業務フローが属人化しており、増員のたびに引き継ぎコストが発生している状態。",
  },
];
