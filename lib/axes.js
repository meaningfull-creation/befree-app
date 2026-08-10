// 企業側・人材側で共通の10軸定義。
// 企業側スコアは 0〜100(低いほど深刻なボトルネック)、
// 人材側スコアは 0〜30(高いほど実績に裏付けられた強み)。

export const AXES = [
  { key: "product", label: "プロダクト戦略" },
  { key: "sales", label: "セールス基盤" },
  { key: "marketing", label: "マーケティング" },
  { key: "hr", label: "採用・組織" },
  { key: "finance_raise", label: "資金調達" },
  { key: "finance_mgmt", label: "財務・管理会計" },
  { key: "cs", label: "カスタマーサクセス" },
  { key: "ops", label: "オペレーション" },
  { key: "tech", label: "技術基盤" },
  { key: "leadership", label: "経営体制" },
];

export const AXIS_KEYS = AXES.map((a) => a.key);
export const AXIS_LABEL_LIST = AXES.map((a) => a.label).join(" / ");
export const AXIS_KEY_LABEL_PAIRS = AXES.map((a) => `${a.key}=${a.label}`).join(", ");

export function clampAxisScores(scores, max) {
  const out = {};
  AXIS_KEYS.forEach((k) => {
    const v = Number(scores?.[k]);
    out[k] = Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : Math.round(max / 2);
  });
  return out;
}
