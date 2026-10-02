// 企業側・人材側で共通の10軸定義。
//
// 企業側スコアは 0〜100(低いほど深刻なボトルネック)。画面に出る「総合スコア」はこの値の平均。
// 人材側スコアは v6.6 から「配点制」。0〜30の独立採点ではなく、
// **経験100点を10軸に配分する**(合計が必ず100点)。
// 独立採点だと経験豊富な人ほど全軸が高くなり、どの企業から見ても上位に出てしまう。
// 配分制なら「どこに経験が寄っているか」しか表せないので、
// 企業は特定された課題に一番合う人に当たり、特化型の人にも打席が回る。

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

// 人材が申告する「得意な働き方」と「大切にしている価値観」の選択肢。
// プロンプトにも投入するため、UIではなくここ(共通ロジック側)に置いている。
export const WORK_STYLE_OPTIONS = [
  "0→1の立ち上げ",
  "型化・仕組み化",
  "既存事業の立て直し",
  "現場実行・マネジメント",
  "対外折衝・パートナーシップ構築",
  "データ分析・意思決定支援",
  "少人数・兼務体制での推進",
  "経営陣への提言・壁打ち",
  "現場メンバーの育成・伴走",
  "業務の引き継ぎ・内製化支援",
  "外部パートナーの選定・管理",
  "プロジェクトマネジメント",
  "リモート中心での支援",
  "現地・現場に入り込む支援",
  "短期集中での課題解決",
  "長期的な体制づくり",
];

export const VALUE_OPTIONS = [
  "スピード重視",
  "着実な積み上げ",
  "現場主義",
  "データドリブンな意思決定",
  "対話・合意形成を重視",
  "自律性・裁量を重視",
  "チームワーク重視",
  "挑戦・変化を好む",
  "安定・再現性を好む",
  "顧客最優先",
  "長期的な関係づくり",
  "誠実さ・透明性",
  "成果へのこだわり",
  "学び続ける姿勢",
  "仕組みで解決する",
  "人の成長を後押しする",
  "率直なフィードバック",
  "現実的な落としどころを探る",
  "品質・丁寧さを重視",
  "コスト意識・費用対効果",
];

// 各軸の「具体的にどの業務を経験したか」の選択肢。
// 10軸(AXES)はスコアの器なので増やせないが、その中身をこの粒度で申告してもらうことで
// AIの採点根拠が具体的になり、企業側にも経験の中身が伝わるようにしている。
// キーはAXESのkeyと対応。値は表示ラベルの配列(そのまま保存・プロンプトに投入する)。
export const FUNCTION_SUBAREAS = {
  product: [
    "プロダクト企画・要件定義", "プロダクトロードマップ策定", "ユーザーリサーチ・課題発見",
    "UI/UX設計・改善", "価格設計・プライシング", "新規プロダクトの立ち上げ",
    "既存プロダクトのグロース", "プロダクトマネジメント(PdM)",
  ],
  sales: [
    "新規開拓・アウトバウンド", "インサイドセールス", "フィールドセールス",
    "エンタープライズ・大手向け営業", "代理店・パートナー営業", "営業組織の立ち上げ",
    "営業マネジメント・育成", "営業プロセス設計・SFA/CRM導入", "提案書・営業資料の作成",
    "価格交渉・契約クロージング",
  ],
  marketing: [
    "デジタル広告運用", "SEO・コンテンツマーケティング", "SNS運用・コミュニティ",
    "リード獲得・MA運用", "ブランディング・PR", "展示会・イベント企画",
    "オフライン広告・販促", "マーケティング組織の立ち上げ", "データ分析・効果測定",
  ],
  hr: [
    "中途採用", "新卒採用", "採用広報・母集団形成", "評価制度の設計・運用",
    "等級・報酬制度の設計", "オンボーディング・定着施策", "労務・就業規則",
    "研修・人材育成", "組織設計・配置", "組織文化づくり・エンゲージメント",
  ],
  finance_raise: [
    "エクイティ調達(VC・エンジェル)", "金融機関からの融資", "補助金・助成金の活用",
    "事業計画・資本政策の策定", "投資家対応・IR", "M&A・資本提携", "IPO準備",
  ],
  finance_mgmt: [
    "月次決算・経理実務", "管理会計・予実管理", "資金繰り・キャッシュフロー管理",
    "原価管理・収益性分析", "予算策定", "税務・会計事務所との連携",
    "経理業務の効率化・システム導入", "内部統制・監査対応",
  ],
  cs: [
    "カスタマーサポート体制の構築", "オンボーディング支援", "解約防止・チャーン対策",
    "アップセル・クロスセル", "カスタマーサクセスの立ち上げ", "顧客の声の収集・製品への反映",
    "サポート業務の効率化・FAQ整備",
  ],
  ops: [
    "業務フローの設計・標準化", "マニュアル整備・型化", "業務システムの導入・移行",
    "BPO・アウトソース活用", "在庫・物流・SCM", "品質管理", "店舗・拠点の運営",
    "業務のDX・自動化", "コスト削減・生産性改善",
  ],
  tech: [
    "Webアプリケーション開発", "モバイルアプリ開発", "インフラ・クラウド構築",
    "データ基盤・分析基盤の構築", "セキュリティ・情報管理", "社内IT・情報システム",
    "開発組織のマネジメント", "技術選定・アーキテクチャ設計", "外部開発会社のマネジメント",
    "AI・機械学習の活用",
  ],
  leadership: [
    "経営企画・事業戦略の策定", "新規事業の立ち上げ", "事業の再建・立て直し",
    "取締役・執行役員としての経営参画", "経営会議・意思決定プロセスの設計",
    "KPI設計・経営数値の管理", "M&A後の統合(PMI)", "事業承継",
    "海外展開・グローバル戦略",
  ],
};

// FUNCTION_SUBAREASを「軸ラベル > 選択肢」の1次元リストに展開したもの(プルダウン表示用)。
export const FUNCTION_SUBAREA_OPTIONS = AXES.flatMap((a) =>
  (FUNCTION_SUBAREAS[a.key] || []).map((label) => ({ value: label, label, group: a.label, axisKey: a.key }))
);
const FUNCTION_SUBAREA_VALUES = new Set(FUNCTION_SUBAREA_OPTIONS.map((o) => o.value));

// 入力された詳細経験タグのサニタイズ(定義済みの選択肢のみ、重複排除、最大40件)。
export function sanitizeSubFunctions(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const t of tags) {
    if (typeof t !== "string" || !FUNCTION_SUBAREA_VALUES.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length === 40) break;
  }
  return out;
}

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

const VALID_PRIORITIES = ["非常に高い", "高い", "中程度"];
const VALID_TIMINGS = ["1ヶ月以内", "3ヶ月以内", "6ヶ月以内"];

// topIssueDetails(最重要課題3件の詳細分析)のサニタイズ。
// AIが不正な軸キー・列挙値・重複・件数超過を返しても壊れないようにする。
export function sanitizeTopIssueDetails(details) {
  if (!Array.isArray(details)) return [];
  const seen = new Set();
  const out = [];
  for (const d of details) {
    const axisKey = d?.axisKey;
    if (typeof axisKey !== "string" || !AXIS_KEYS.includes(axisKey) || seen.has(axisKey)) continue;
    seen.add(axisKey);
    out.push({
      axisKey,
      currentState: typeof d.currentState === "string" ? d.currentState.slice(0, 200) : "",
      risk: typeof d.risk === "string" ? d.risk.slice(0, 200) : "",
      priority: VALID_PRIORITIES.includes(d.priority) ? d.priority : "中程度",
      recommendedTiming: VALID_TIMINGS.includes(d.recommendedTiming) ? d.recommendedTiming : "3ヶ月以内",
    });
    if (out.length === 3) break;
  }
  return out;
}

// 人材のgrowthAreas(これから伸ばしていきたい領域、最大2件)のサニタイズ。
// AIが不正な軸キー・重複・件数超過を返しても壊れないようにする。
export function sanitizeGrowthAreas(areas) {
  if (!Array.isArray(areas)) return [];
  const seen = new Set();
  const out = [];
  for (const a of areas) {
    const axisKey = a?.axisKey;
    if (typeof axisKey !== "string" || !AXIS_KEYS.includes(axisKey) || seen.has(axisKey)) continue;
    seen.add(axisKey);
    out.push({ axisKey, note: typeof a.note === "string" ? a.note.slice(0, 200) : "" });
    if (out.length === 2) break;
  }
  return out;
}

// 人材スコアの配点(v6.6の配点制)。
// 10軸の合計がこの点数になるよう配分する。
export const TALENT_POINT_BUDGET = 100;

// 1つの軸に何点集まれば「この軸は即戦力」とみなすかの基準。
// 合計100点なので、30点以上を取れる軸は最大3つ。企業側の「課題TOP3」と対になる設計。
export const TALENT_FOCUS_POINTS = 30;

// 配分の目安。AIへのプロンプトと、結果画面での説明の両方で使う。
export const TALENT_SCORE_RUBRIC = [
  { range: "0", label: "実務経験がない領域" },
  { range: "1〜9", label: "部分的な関与・周辺業務としての接点" },
  { range: "10〜24", label: "チームの一員として実務を担当した経験がある" },
  { range: "25〜39", label: "中核メンバー・責任者として主導した経験がある(=この領域が主戦場)" },
  { range: "40以上", label: "キャリアの大半をこの領域に費やしてきた専門特化型" },
];

// 任意のスコアベクトルを「合計がちょうど budget 点になる整数の配分」に正規化する。
// (全軸0の入力だけは例外で、全軸0のまま返す)
//
// 正規化済みのベクトルを入れても結果が変わらない(べき等)ので、
// 配点制より前に保存された0〜30点のスキルマップも、移行作業なしでそのまま扱える。
// 端数は最大剰余法(Hare方式)で配り、同点時は AXIS_KEYS の定義順で決める(結果は常に同じ)。
export function normalizeAllocation(scores, budget = TALENT_POINT_BUDGET) {
  const raw = AXIS_KEYS.map((k) => {
    const v = Number(scores?.[k]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  });
  const sum = raw.reduce((a, b) => a + b, 0);

  // 全軸0・未入力・不正値しかない場合は、配分できる情報がないので全軸0のまま返す。
  // (均等に配ると「未解析の人材」がどの企業にも3割前後で当たってしまうため)
  // この場合だけ合計は100ではなく0になる。
  if (sum <= 0) {
    const out = {};
    AXIS_KEYS.forEach((k) => { out[k] = 0; });
    return out;
  }

  const exact = raw.map((v) => (v / sum) * budget);
  const floors = exact.map((v) => Math.floor(v));
  let remaining = budget - floors.reduce((a, b) => a + b, 0);

  // 小数部が大きい軸から1点ずつ配って、合計をぴったり budget に合わせる
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = {};
  AXIS_KEYS.forEach((k, i) => { out[k] = floors[i]; });
  for (const { i } of order) {
    if (remaining <= 0) break;
    out[AXIS_KEYS[i]] += 1;
    remaining -= 1;
  }
  return out;
}

// 企業の診断スコア(各軸0〜100、低いほど深刻)から「いま解くべき課題100点の配分」を作る。
// 不足分(100 - スコア)を合計100点に正規化したもの。画面に出る診断スコアはそのまま残し、
// マッチングの重み付けだけをこの配分で行う。
export function issueAllocation(companyScores, budget = TALENT_POINT_BUDGET) {
  const gaps = {};
  AXIS_KEYS.forEach((k) => {
    const v = Number(companyScores?.[k]);
    gaps[k] = 100 - (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50);
  });
  return normalizeAllocation(gaps, budget);
}
