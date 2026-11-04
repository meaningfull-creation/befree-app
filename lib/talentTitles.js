// 実務経験者の「役職・ポジション」の選択肢と、その保存形式の変換。
//
// v6.16で2点変えた。
//  1. すべての選択肢から「元」を外した。現役で同じ職種に就いている方が
//     「元プロダクト責任者」を選びにくく、当てはまる選択肢が無いように見えてしまうため。
//     本業と並行して関わる方(=現職)も対象なので、過去形で限定しない書き方に揃える。
//  2. 複数選択できるようにした。兼任している方が1つに絞れず、実態と違う申告に
//     なってしまっていた(例: 事業責任者とマーケティング責任者を兼ねている)。

export const TALENT_TITLE_OTHER = "その他(自由入力)";

export const TALENT_TITLE_GROUPS = [
  {
    label: "責任者・エグゼクティブクラス",
    options: [
      "プロダクト責任者 / VPoP",
      "セールス責任者 / VPoS",
      "マーケティング責任者 / CMO",
      "人事責任者 / CHRO・HRBP",
      "CFO / 資金調達責任者",
      "経営企画責任者 / 管理会計責任者",
      "カスタマーサクセス責任者",
      "オペレーション責任者 / COO",
      "CTO / VPoE",
      "事業責任者 / PL管掌",
      "法務責任者 / CLO",
      "広報・PR責任者",
      "データ責任者 / CDO",
      "購買・調達責任者",
      "経営者 / CEO",
    ],
  },
  {
    label: "マネージャー・リードクラス",
    options: [
      "プロダクトマネージャー",
      "セールスマネージャー / フィールドセールス",
      "マーケティングマネージャー / グロース担当",
      "人事マネージャー / 採用担当",
      "経理・財務マネージャー",
      "カスタマーサクセスマネージャー",
      "業務改善マネージャー / PMO",
      "テックリード / シニアエンジニア",
      "デザインリード / UXデザイナー",
      "インサイドセールス / SDRマネージャー",
      "法務・コンプライアンス担当",
      "広報・PRマネージャー",
      "データアナリスト / データサイエンティスト",
      "カスタマーサポートマネージャー",
      "購買・調達マネージャー",
    ],
  },
  {
    // 店舗・現場を預かる役職。本部や職能別の役職だけだと、小売・飲食・サービス・
    // 建設など「現場を回してきた経験」を持つ方が当てはまる選択肢がなかった。
    label: "店舗・現場クラス",
    options: ["店長", "副店長", "チーフ", "サブチーフ", "現場責任者(現場監督)"],
  },
];

// 選択肢をMultiSelectDropdownが扱える形({value,label,group})に変換したもの
export const TALENT_TITLE_OPTIONS = TALENT_TITLE_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ value: o, label: o, group: g.label }))
);

const KNOWN_TITLES = new Set(TALENT_TITLE_GROUPS.flatMap((g) => g.options));

// 複数の役職は「、」でつないで1つの文字列にも保存する。
// 画面表示・AIプロンプト・管理画面・CSVはこの1文字列を見るだけでよくなる。
// 選択肢に「、」を含むものは無いので、区切りとして安全に使える。
export const TITLE_SEPARATOR = "、";

// 「元プロダクト責任者 / VPoP」のような旧データを、現在の選択肢に合わせる。
// v6.16より前はすべての選択肢に「元」が付いていたため、そのままでは
// どの選択肢にも一致せず「その他」に落ちてしまう。
export function normalizeTitle(value) {
  const v = (value || "").trim();
  if (!v) return "";
  if (KNOWN_TITLES.has(v)) return v;
  if (v.startsWith("元")) {
    const stripped = v.slice(1).trim();
    if (KNOWN_TITLES.has(stripped)) return stripped;
  }
  return v;
}

// 保存されている値(titles配列、または旧形式の文字列)を、フォームの状態に戻す。
// 戻り値: { titles: [選択肢に一致したもの], titleOther: "自由入力に残すもの" }
export function parseTitles(titles, title) {
  const raw = Array.isArray(titles) && titles.length
    ? titles
    : String(title || "").split(TITLE_SEPARATOR);

  const picked = [];
  const others = [];
  for (const item of raw) {
    const normalized = normalizeTitle(item);
    if (!normalized) continue;
    if (KNOWN_TITLES.has(normalized)) {
      if (!picked.includes(normalized)) picked.push(normalized);
    } else if (normalized !== TALENT_TITLE_OTHER && !others.includes(normalized)) {
      others.push(normalized);
    }
  }
  return { titles: picked, titleOther: others.join(TITLE_SEPARATOR) };
}

// フォームの状態を、保存・表示に使う形に変換する。
// 戻り値: { titles: [...], title: "、でつないだ1文字列" }
//
// この関数は2回通ることがある(画面で組み立てた結果を、保存時にもう一度通す)。
// そのため冪等でなければならない — selected に入っている自由記述を
// 「選択肢に無いから」と捨ててしまうと、2回目で消えてしまう。
export function formatTitles(selected, other) {
  const list = [];
  const add = (value) => {
    const v = normalizeTitle(value);
    if (!v || v === TALENT_TITLE_OTHER || list.includes(v)) return;
    list.push(v);
  };
  for (const t of Array.isArray(selected) ? selected : []) add(t);
  add(other);
  return { titles: list, title: list.join(TITLE_SEPARATOR) };
}
