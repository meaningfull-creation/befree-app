// フェーズ2移行に伴い、実際の候補データはDB(prisma/seed.js)に移行済み。
// このファイルは実行時には使われていない。参考用に残している(フィールド対応の把握用)。
//
// フェーズ1では実データベースの代わりに簡易データで運用する。
// フェーズ2でこの内容は company_skill_maps / talent_skill_maps テーブルに置き換わる想定。
// (BeFree_技術構成設計.md 参照)

export const TALENT_CANDIDATES = [
  {
    id: "t_miyazaki",
    name: "宮崎 大輔",
    role: "元人事責任者 / シリーズA〜B 3社経験",
    axis: "採用・組織",
    phaseTags: ["シリーズA", "シリーズB"],
    axisScores: { product: 8, sales: 10, marketing: 7, hr: 29, finance_raise: 6, finance_mgmt: 12, cs: 14, ops: 19, tech: 5, leadership: 22 },
    reason: "急成長期の採用基準設計とオンボーディング整備を3社で主導。組織図が『人ありき』になっている状態からの立て直しが専門領域です。",
  },
  {
    id: "t_koike",
    name: "小池 美咲",
    role: "元CFO室 / 管理会計・資金調達支援",
    axis: "財務・管理会計",
    phaseTags: ["シリーズA", "シリーズB以降"],
    axisScores: { product: 9, sales: 6, marketing: 5, hr: 10, finance_raise: 24, finance_mgmt: 29, cs: 8, ops: 15, tech: 7, leadership: 18 },
    reason: "月次早期化と資金繰り管理のダッシュボード構築を得意とし、着地が見えない状態から週次で着地を追える体制への移行を複数社で実施。",
  },
  {
    id: "t_endo",
    name: "遠藤 慧",
    role: "元セールスイネーブルメント責任者",
    axis: "セールス基盤",
    phaseTags: ["シード", "プレシリーズA", "シリーズA"],
    axisScores: { product: 13, sales: 27, marketing: 18, hr: 9, finance_raise: 7, finance_mgmt: 6, cs: 20, ops: 14, tech: 8, leadership: 12 },
    reason: "属人化した営業プロセスの型化と初期セールスチームの立ち上げ経験が豊富。個人商店化した営業からの脱却を支援します。",
  },
];

export const COMPANY_CANDIDATES = [
  {
    id: "c_northtech",
    name: "株式会社ノーステック",
    phase: "シリーズA / SaaS",
    bottleneck: "採用・組織",
    companyScores: { product: 72, sales: 34, marketing: 48, hr: 29, finance_raise: 61, finance_mgmt: 22, cs: 55, ops: 44, tech: 68, leadership: 58 },
    reason: "直近3ヶ月で採用基準が社内で揃わず、面接官ごとに評価がぶれている状態。組織図が『人ありき』になっている点の立て直しが必要とされています。",
  },
  {
    id: "c_hareno",
    name: "株式会社ハレノ",
    phase: "シリーズB / ヘルスケア",
    bottleneck: "経営体制",
    companyScores: { product: 65, sales: 52, marketing: 58, hr: 46, finance_raise: 55, finance_mgmt: 49, cs: 61, ops: 38, tech: 60, leadership: 24 },
    reason: "急拡大に伴いミドルマネジメント層が不在で、経営陣に意思決定が集中している状態。権限委譲の設計と運用が求められています。",
  },
  {
    id: "c_miraiba",
    name: "合同会社ミライバ",
    phase: "プレシリーズA / D2C",
    bottleneck: "オペレーション",
    companyScores: { product: 58, sales: 41, marketing: 44, hr: 39, finance_raise: 47, finance_mgmt: 36, cs: 40, ops: 21, tech: 33, leadership: 45 },
    reason: "業務フローが属人化しており、増員のたびに引き継ぎコストが発生している状態。標準化と定着支援が必要とされています。",
  },
];
