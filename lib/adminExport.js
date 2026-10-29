// 管理画面のエクスポート(CSV)を組み立てる。
//
// 一覧ページの「CSVダウンロード」と、エクスポート画面の一括ダウンロードの両方から
// 同じ関数を使う。DBアクセスを含まない純粋な変換にしてあるので、単体テストできる。

import { AXES } from "./axes.js";
import { buildCsv } from "./csv.js";
import { talentDisplayName } from "./talentProfile.js";
import { companyDisplayName } from "./companyProfile.js";

const AXIS_LABELS = AXES.map((a) => a.label);
const AXIS_KEYS = AXES.map((a) => a.key);

// 一覧ページと同じ検索条件。以前はCSV側が氏名/会社名しか見ておらず、
// メールアドレスで検索した状態でダウンロードすると結果がずれていた。
export function nameOrEmailWhere(q) {
  const needle = q?.trim();
  if (!needle) return {};
  return {
    OR: [
      { name: { contains: needle, mode: "insensitive" } },
      { user: { email: { contains: needle, mode: "insensitive" } } },
    ],
  };
}

// 一覧の「登録状況」と同じ区分。名前が空 = アカウント作成だけで離脱した方。
export function registrationStageLabel(name, hasSkillMap) {
  if (hasSkillMap) return "完了";
  return name ? "入力途中" : "アカウントのみ";
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function axisLabelsOf(keys) {
  return jsonArray(keys)
    .map((k) => AXES.find((a) => a.key === k)?.label || k)
    .join(" / ");
}

function date(value) {
  return value ? new Date(value).toLocaleDateString("ja-JP") : "";
}

// スキルマップの10軸を、AXESの順で取り出す(欠けている軸は空欄)
function axisValues(axisScores) {
  if (!axisScores) return AXIS_KEYS.map(() => "");
  return AXIS_KEYS.map((k) => (axisScores[k] == null ? "" : axisScores[k]));
}

export const TALENT_CSV_HEADERS = [
  "氏名", "メールアドレス", "登録状況", "審査状況",
  "役職", "業種経験", "実務経験年数",
  "経験機能領域", "具体的な経験業務", "得意な働き方", "価値観", "職務経歴・実績",
  "稼働(現在h)", "稼働上限(社)",
  "最新解析日", "登録日",
  // 10軸の配点(合計100点)。分析に使えるよう1軸1列で出す。
  ...AXIS_LABELS,
  "強みの上位3軸",
];

export function talentCsvRow(t) {
  const sm = t.skillMaps?.[0];
  const scores = sm?.axisScores || null;
  const top3 = scores
    ? Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${AXES.find((a) => a.key === k)?.label || k}:${v}`)
        .join(" / ")
    : "";
  return [
    talentDisplayName(t.name),
    t.user?.email ?? "",
    registrationStageLabel(t.name, !!sm),
    t.status,
    t.title, t.industry, t.years,
    axisLabelsOf(t.experiencedFunctions),
    jsonArray(t.experiencedSubAreas).join(" / "),
    jsonArray(t.workStyleTags).join(" / "),
    jsonArray(t.valueTags).join(" / "),
    t.careerHistory || t.bio || "",
    t.capacity?.currentCommittedHours ?? "",
    t.capacity?.maxConcurrentEngagements ?? "",
    date(sm?.createdAt),
    date(t.createdAt),
    ...axisValues(scores),
    top3,
  ];
}

export function buildTalentsCsv(talents) {
  return buildCsv(TALENT_CSV_HEADERS, talents.map(talentCsvRow));
}

export const COMPANY_CSV_HEADERS = [
  "会社名", "メールアドレス", "登録状況",
  "業種", "従業員数", "外部資本の有無", "成長段階", "年商",
  "最新診断日", "登録日", "総合スコア",
  // 10軸のスコア(低いほど深刻)
  ...AXIS_LABELS,
  "最優先ボトルネック",
];

export function companyCsvRow(c) {
  const sm = c.skillMaps?.[0];
  const scores = sm?.axisScores || null;
  const values = scores ? Object.values(scores) : [];
  const avg = values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : "";
  const worst = scores
    ? Object.entries(scores)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 1)
        .map(([k, v]) => `${AXES.find((a) => a.key === k)?.label || k}:${v}`)
        .join("")
    : "";
  return [
    companyDisplayName(c.name),
    c.user?.email ?? "",
    registrationStageLabel(c.name, !!sm),
    c.industry, c.headcount,
    c.fundingType === "vc" ? "外部資本あり" : c.fundingType === "independent" ? "外部資本なし" : "",
    c.phase, c.revenue,
    date(sm?.createdAt),
    date(c.createdAt),
    avg,
    ...axisValues(scores),
    worst,
  ];
}

export function buildCompaniesCsv(companies) {
  return buildCsv(COMPANY_CSV_HEADERS, companies.map(companyCsvRow));
}

// 一覧・エクスポートで共通して使う取得条件(include)
export const TALENT_EXPORT_INCLUDE = {
  skillMaps: { orderBy: { createdAt: "desc" }, take: 1 },
  capacity: true,
  user: { select: { email: true } },
};

export const COMPANY_EXPORT_INCLUDE = {
  skillMaps: { orderBy: { createdAt: "desc" }, take: 1 },
  user: { select: { email: true } },
};
