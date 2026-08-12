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

// axisNotes(軸ごとの一言分析)のサニタイズ。全10軸のキーを保証し、文字列以外・欠損は空文字にする。
export function sanitizeAxisNotes(notes) {
  const out = {};
  AXIS_KEYS.forEach((k) => {
    const v = notes?.[k];
    out[k] = typeof v === "string" ? v.slice(0, 200) : "";
  });
  return out;
}

// 人材側スキルスコア(0〜30点)の採点基準。AIへのプロンプトと、結果画面での表示の両方で使う。
export const TALENT_SCORE_RUBRIC = [
  { range: "0〜5", label: "実務経験なし、またはごく限定的な関与" },
  { range: "6〜14", label: "部分的な関与・チームメンバーとしてのサポート経験" },
  { range: "15〜22", label: "中核メンバーとして主導した実務経験がある" },
  { range: "23〜30", label: "責任者としてゼロイチ構築・大きな成果を出した実績がある" },
];
