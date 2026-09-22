// 業種・業界の選択肢。企業側の登録フォーム・人材側の業種経験・
// AIによる「経験を活かせる業界」の候補生成で共通して使うため、共通ロジック側に置いている。
export const INDUSTRY_OPTIONS = [
  "IT・インターネット・通信",
  "ソフトウェア・SaaS・システム受託開発",
  "フィンテック・金融",
  "保険・保険代理店",
  "ヘルスケア・医療",
  "介護・福祉",
  "バイオ・製薬",
  "D2C・EC・通販",
  "小売・店舗運営",
  "卸売・商社",
  "製造業・メーカー",
  "化学・素材",
  "自動車・輸送機器",
  "電機・電子部品",
  "建設・工務店",
  "不動産",
  "設備工事・電気工事",
  "運輸・物流・倉庫",
  "エネルギー・インフラ",
  "農林水産・食品",
  "人材紹介・人材派遣",
  "人材・HRテック",
  "教育・EdTech・スクール運営",
  "メディア・出版・印刷",
  "広告代理店・PR",
  "エンタメ・イベント",
  "コンサルティング・専門サービス",
  "士業(会計・税務・法律等)",
  "官公庁・自治体・公共",
  "非営利・NPO・社団法人",
  "旅行・宿泊",
  "飲食店経営",
  "美容・理容・エステ",
  "冠婚葬祭",
  "スポーツ・フィットネス",
  "その他(自由入力)",
];

// 「その他(自由入力)」は選択肢であって業界名ではないため、AIに候補を出させる際の母集団からは除く。
export const INDUSTRY_CANDIDATES = INDUSTRY_OPTIONS.filter((o) => !o.startsWith("その他"));

const INDUSTRY_SET = new Set(INDUSTRY_CANDIDATES);

// AIが返した「経験を活かせる業界」候補のサニタイズ。
// 定義済みの業界名のみ・重複排除・最大4件・理由は80字までに丸める。
export function sanitizeIndustryFit(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const industry = typeof it === "string" ? it : it?.industry;
    if (typeof industry !== "string" || !INDUSTRY_SET.has(industry) || seen.has(industry)) continue;
    seen.add(industry);
    out.push({
      industry,
      reason: typeof it?.reason === "string" ? it.reason.slice(0, 80) : "",
    });
    if (out.length === 4) break;
  }
  return out;
}
