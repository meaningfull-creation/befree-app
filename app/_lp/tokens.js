// ---------------------------------------------------------------------------
// BATTER BOX LP — Design Tokens
//
// ランディングページ専用のデザイントークン。ページごとに場当たり的なCSSを書かず、
// 必ずここの値を参照する。アプリ内部(/app 以降)は従来の lib/theme.jsx を使う。
//
// アートディレクション: EXPERIENCE MOVES BUSINESS.
//   企業を動かすのは人員ではなく「経験」。BATTER BOXは経験を流通させる場である。
//   感情: 明るい / 前向き / 知的 / 大胆 / 人間的 / 少しの遊び心
// ---------------------------------------------------------------------------

export const LP_COLOR = {
  // 面の60〜70%を占める地
  white: "#FFFFFF",
  paper: "#FAFAF8", // 白の中でわずかに差をつけたい時だけ使う

  // ブランドの象徴。ベタ面で大胆に使い、グラデーションはかけない
  orange: "#F46919", // ロゴから抽出した既存のブランドオレンジ
  orangeDeep: "#D4540B", // ホバー時・オレンジ面上の細い線
  orangeTint: "#FFF2EA", // ごく淡い下地(多用しない)

  // 完全な黒(#000)は硬すぎるため、わずかに柔らかい濃いグレー
  ink: "#121214",
  inkSoft: "#4C4C52", // 本文の補助テキスト
  inkFaint: "#8A8A90", // 注釈・極小ラベル
  line: "#E6E6E4", // 白地の罫線
  lineOnInk: "rgba(255,255,255,0.16)",
  lineOnOrange: "rgba(255,255,255,0.32)",
};

// 英字は力強いグロテスク(Archivo)、日本語は太いゴシック(Noto Sans JP)。
// 角丸のポップ体は「知的・大胆」と衝突するため使わない。
export const LP_FONT = {
  jp: "'Noto Sans JP', sans-serif",
  en: "'Archivo', 'Noto Sans JP', sans-serif",
};

// タイポグラフィのジャンプ率を大きく取る。最大と最小で10倍以上の差をつける。
export const LP_TYPE = {
  display: "clamp(40px, 7.0vw, 100px)", // Heroのブランドコピー。「その経験に、」が必ず1行に収まる上限
  giant: "clamp(34px, 6.2vw, 88px)", // セクションの主役コピー
  head: "clamp(24px, 3.4vw, 46px)", // セクション見出し
  sub: "clamp(17px, 1.6vw, 22px)", // リード文
  body: "15.5px",
  small: "13.5px",
  label: "11px", // 英字ラベル。字間を広く取る
};

export const LP_SPACE = {
  // 余白は大きく取るが、v6.0では過剰だった(1セクションで上下400pxに達し、
  // 中身50文字に対して高さ1944pxという面ができていた)。密度に見合う値まで戻す。
  section: "clamp(72px, 8.5vw, 132px)",
  sectionTight: "clamp(56px, 6vw, 88px)",
  gutter: "clamp(20px, 5vw, 80px)", // 画面左右の余白
  container: 1440, // コンテンツ幅は広めに取る
  containerNarrow: 1080,
};

// 角丸は大きくしない。すべてをカード化せず、罫線・タイポ・余白で情報を整理する。
export const LP_RADIUS = { none: 0, xs: 2, sm: 4 };

export const LP_MOTION = {
  fast: "180ms cubic-bezier(0.22, 1, 0.36, 1)",
  base: "420ms cubic-bezier(0.22, 1, 0.36, 1)",
  slow: "900ms cubic-bezier(0.22, 1, 0.36, 1)",
};

export const LP_BREAK = { sm: 640, md: 900, lg: 1200 };

// モバイルの可読性の下限。情報量を増やしても、ここは絶対に下回らせない。
//   本文 15px / 補助テキスト 13px / ラベル 11px / タップ領域 48px
// (iOSは16px未満の入力欄でズームするため、input は16px以上にする)
export const LP_MOBILE_MIN = { body: 15, small: 13, label: 11, tap: 48, input: 16 };

// ---------------------------------------------------------------------------
// ブランド造形言語 — 野球の「打席」を抽象化し、サイト全体の共通言語にする。
// これが「一目でBATTER BOXだと分かる」の実体になる。
// ---------------------------------------------------------------------------

// ホームベースの五角形。Experience Tag・番号バッジ・矢印の先端に使う。
export const HOME_PLATE_CLIP = "polygon(0% 0%, 100% 0%, 100% 62%, 50% 100%, 0% 62%)";

// 人物写真を public/people/01.jpg 〜 に配置したら true にする。
// false の間は写真を読みに行かず(404を出さず)、ブランド造形で表示する。
// 写真は「フリー素材感」を出さないこと。スーツで腕組みしたカットは使わず、
// 仕事をしている/話している/考えている/笑っている、自然体のカットを使う。
export const PEOPLE_PHOTOS_READY = false;

// マーキーに流す「世の中に存在する経験」。装飾ではなく思想の提示。
export const EXPERIENCE_MARQUEE = [
  "NEW BUSINESS", "SALES", "IPO", "MARKETING", "GLOBAL",
  "HR", "FINANCE", "PRODUCT", "MANAGEMENT", "DX",
  "CUSTOMER SUCCESS", "FUNDRAISING", "M&A", "OPERATIONS", "BRANDING",
];
