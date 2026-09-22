// BATTER BOXのユーザー向け画面共通デザイントークン。
// 「野球のバッターボックス」をモチーフにしたロゴ(ネイビー×オレンジ)に合わせて、
// サイト全体の配色をそのブランドカラーへ統一している。
// キー名(teal/tealDim/amber等)は初期実装からの互換のため維持しているが、
// 値そのものはロゴから抽出したネイビー×オレンジのパレットになっている。
const COLORS_IN_PROGRESS_BG = "#F46919"; // 進行中バッジの塗り(ブランドのオレンジ)

export const COLORS = {
  bg: "#F7F9FC",           // 淡いブルーグレーの背景
  surface: "#FFFFFF",      // カード背景
  surfaceRaised: "#EEF2F7", // 入力欄・サブパネルなどの背景
  border: "#DCE3EC",       // 柔らかいブルーグレーの境界線
  text: "#04162D",         // ロゴと同じ濃いネイビー
  muted: "#5B6B82",        // ネイビー系のミュートグレー
  faint: "#A6B0C0",        // さらに淡いグレー
  teal: "#F46919",         // プライマリアクセント(ロゴのオレンジ)
  tealDim: "#C35414",      // プライマリアクセントの濃色
  amber: "#1B3A63",        // セカンダリアクセント(ロゴのネイビーの明るいトーン)
  onAccent: "#FFFFFF",     // アクセント色の上に乗せるテキスト・アイコン色
  success: "#1E9E5A",      // 完了・承認を表す緑(ブランド2色と混同しないよう別系統の色を使う)
  successDim: "#167A45",   // 緑の濃色
  successBg: "#E8F6EE",    // 緑の淡い背景
};

// タスク/プロジェクトのステータス表示を1箇所にまとめたもの。
// 「未着手」「進行中」「完了」が一目で見分けられるよう、色相(グレー/オレンジ/緑)だけでなく
// 塗り(白抜き/ベタ塗り)と記号(○/▶/✓)も変えている(色覚特性に配慮)。
export const TASK_STATUS_META = {
  todo: {
    label: "未着手",
    icon: "○",
    fg: "#5B6B82",
    bg: "#FFFFFF",
    border: "#B9C4D3",
    bar: "#C8D2E0",
    rowBg: "#FFFFFF",
  },
  in_progress: {
    label: "進行中",
    icon: "▶",
    fg: "#FFFFFF",
    bg: COLORS_IN_PROGRESS_BG,
    border: COLORS_IN_PROGRESS_BG,
    bar: COLORS_IN_PROGRESS_BG,
    rowBg: "#FFF3EA",
  },
  done: {
    label: "完了",
    icon: "✓",
    fg: "#FFFFFF",
    bg: "#1E9E5A",
    border: "#1E9E5A",
    bar: "#1E9E5A",
    rowBg: "#F2F8F5",
  },
};
export const TASK_STATUS_ORDER = ["todo", "in_progress", "done"];
export const FONT_DISPLAY = "'M PLUS Rounded 1c', sans-serif";
export const FONT_BODY = "'Zen Kaku Gothic New', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      .app-root { font-family: ${FONT_BODY}; background: ${COLORS.bg}; color: ${COLORS.text}; min-height: 100vh; width: 100%; position: relative;
        /* clip はスクロールコンテナを作らないため、ヘッダーの position:sticky が効く。
           未対応ブラウザは直前の hidden にフォールバックする(その場合ヘッダーは固定されない) */
        overflow-x: hidden; overflow-x: clip; }
      .app-root::before {
        content: ""; position: absolute; inset: 0;
        background: radial-gradient(ellipse 900px 500px at 15% -10%, rgba(244,105,25,0.07), transparent 60%),
                    radial-gradient(ellipse 700px 500px at 100% 10%, rgba(27,58,99,0.07), transparent 60%);
        pointer-events: none;
      }
      .fade-in { animation: fadeIn 0.5s ease both; }
      @keyframes fadeIn { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
      .pulse-dot { animation: pulseDot 1.6s ease-in-out infinite; }
      @keyframes pulseDot { 0%,100%{opacity:.35;} 50%{opacity:1;} }
      .btn-primary { background: ${COLORS.teal}; color: ${COLORS.onAccent}; font-family: ${FONT_DISPLAY}; font-weight: 700; border: none; border-radius: 999px; padding: 13px 24px; font-size: 14.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 3px 0 ${COLORS.tealDim}; transition: transform 0.15s ease, box-shadow 0.15s ease; text-decoration: none; }
      .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(244,105,25,0.35); }
      .btn-primary:active { transform: translateY(1px); box-shadow: 0 1px 0 ${COLORS.tealDim}; }
      .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform:none; box-shadow:none; }
      .btn-ghost { background: ${COLORS.surface}; color: ${COLORS.text}; border: 1.5px solid ${COLORS.border}; border-radius: 999px; padding: 11px 20px; font-size: 13.5px; cursor: pointer; font-family: ${FONT_BODY}; font-weight: 500; transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease; text-decoration: none; display: inline-flex; align-items: center; }
      .btn-ghost:hover { border-color: ${COLORS.teal}; color: ${COLORS.tealDim}; transform: translateY(-1px); }
      .field-label { font-size: 12.5px; letter-spacing: 0.02em; color: ${COLORS.muted}; margin-bottom: 7px; display: block; font-family: ${FONT_BODY}; font-weight: 500; }
      .field-input, .field-select { width: 100%; background: ${COLORS.surfaceRaised}; border: 1.5px solid ${COLORS.border}; color: ${COLORS.text}; border-radius: 14px; padding: 12px 14px; font-size: 14px; font-family: ${FONT_BODY}; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
      .field-input:focus, .field-select:focus { border-color: ${COLORS.teal}; box-shadow: 0 0 0 3px rgba(244,105,25,0.14); }
      .field-input::placeholder { color: ${COLORS.faint}; }
      *:focus-visible { outline: 2px solid ${COLORS.teal}; outline-offset: 2px; }
      ::selection { background: rgba(244,105,25,0.18); }
      .two-col { grid-template-columns: 1fr 1fr; }
      /* ---- ランディングページ ---- */
      /* セクションの余白・見出しの大きさを1箇所で決め、画面幅に応じて連動させる */
      .lp-section { max-width: 1040px; margin: 0 auto; padding: 64px 24px; }
      .lp-band { background: ${COLORS.surface}; border-top: 1px solid ${COLORS.border}; border-bottom: 1px solid ${COLORS.border}; }
      .lp-eyebrow { font-family: ${FONT_MONO}; font-size: 11px; letter-spacing: 0.08em; color: ${COLORS.teal}; margin-bottom: 10px; display: block; }
      .lp-h2 { font-family: ${FONT_DISPLAY}; font-weight: 800; font-size: clamp(20px, 4.2vw, 27px); line-height: 1.5; margin: 0 0 12px; }
      .lp-lead { font-size: 14px; color: ${COLORS.muted}; line-height: 1.9; margin: 0; max-width: 620px; }
      /* ヒーロー: デスクトップは本文とプレビューの2カラム、モバイルは縦積み */
      .lp-hero-grid { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: center; }
      .lp-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
      .lp-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .lp-cards-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 18px; }
      /* モバイルで画面下に固定するCTA。スクロール位置に関係なく次の一歩が押せる状態にする */
      .lp-sticky-cta { display: none; }
      @media (max-width: 860px) {
        .lp-hero-grid { grid-template-columns: 1fr; gap: 28px; }
        /* 縦積みになると横方向のグラデーションでは文字が読めなくなるため、
           イラストは下に薄く敷き、上から白のグラデーションをかける */
        .lp-hero-art { background-position: center 70% !important; opacity: 0.5; }
        .lp-hero-veil { background: linear-gradient(180deg, ${COLORS.bg} 0%, rgba(247,249,252,0.97) 45%, rgba(247,249,252,0.85) 100%) !important; }
      }
      @media (max-width: 620px) {
        .lp-nav-sub { display: none !important; }
        .lp-section { padding: 44px 20px; }
        .lp-cta-row .btn-primary, .lp-cta-row .btn-ghost { width: 100%; justify-content: center; }
        .lp-sticky-cta {
          display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 70; gap: 10px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border-top: 1px solid ${COLORS.border}; box-shadow: 0 -4px 18px rgba(4,22,45,0.08);
          padding: 10px max(14px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
        }
        .lp-sticky-cta > * { flex: 1; justify-content: center; text-align: center; }
        .lp-has-sticky-cta { padding-bottom: 86px; }
      }
      /* 新規登録: 左に「登録後に何が起きるか」、右に入力欄を並べる */
      .signup-split { grid-template-columns: 1fr 1fr; }
      .role-card { transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; }
      .role-card:hover { transform: translateY(-3px); border-color: ${COLORS.teal}; box-shadow: 0 10px 30px rgba(4,22,45,0.09); }
      @media (max-width: 760px) {
        .signup-split { grid-template-columns: 1fr; }
      }
      /* ダッシュボード: 指標タイル → パネルのグリッド、という2段構成。
         縦一列に積むと画面が間延びするため、幅が取れるときは自動で多段に並べる。 */
      .dash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(158px, 1fr)); gap: 12px; margin-bottom: 18px; }
      .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 16px; align-items: start; }
      .dash-grid .span-all { grid-column: 1 / -1; }
      @media (max-width: 700px) {
        .dash-grid { grid-template-columns: 1fr; }
        .dash-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      }
      /* 一覧行の中の細い進捗バー(タスク進捗など) */
      .mini-bar { height: 5px; border-radius: 999px; background: ${COLORS.surfaceRaised}; overflow: hidden; flex: 1; min-width: 60px; }
      .mini-bar > span { display: block; height: 100%; border-radius: 999px; background: ${COLORS.teal}; }
      /* アプリ画面のヘッダー。ロゴを左上・操作を右上に固定表示する(スクロールしても常に見える) */
      .app-topbar {
        position: sticky; top: 0; z-index: 50;
        background: rgba(255,255,255,0.92);
        backdrop-filter: saturate(180%) blur(10px);
        -webkit-backdrop-filter: saturate(180%) blur(10px);
        border-bottom: 1px solid ${COLORS.border};
        padding-top: env(safe-area-inset-top);
      }
      .app-topbar-inner {
        display: flex; align-items: center; gap: 12px;
        max-width: 880px; margin: 0 auto;
        padding: 10px max(16px, env(safe-area-inset-right)) 10px max(16px, env(safe-area-inset-left));
      }
      .app-topbar-logo { height: 54px; width: auto; display: block; }
      @media (max-width: 720px) {
        .app-topbar-inner { padding-top: 8px; padding-bottom: 8px; }
        .app-topbar-logo { height: 40px; }
      }
      /* 契約の進行フロー(契約成立→実行中→完了報告→企業が確認→契約完了)のステッパー */
      .flow-steps { display: flex; align-items: flex-start; }
      .flow-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
      .flow-step-line { position: absolute; top: 12px; right: 50%; left: -50%; height: 2px; }
      /* 未読バッジ(赤の丸ピル)。ヘッダー・下部タブ・メッセージ一覧で共用 */
      .nav-badge { background: #e5484d; color: #ffffff; border-radius: 999px; font-size: 10px; font-weight: 700; line-height: 1; min-width: 17px; height: 17px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; }
      .nav-badge-float { position: absolute; top: -6px; right: -10px; margin: 0; z-index: 1; box-shadow: 0 0 0 2px ${COLORS.surface}; }
      /* メインメニュー: デスクトップはヘッダーのボタン列、モバイルは画面下部の固定タブ */
      .top-nav { display: flex; align-items: center; gap: 8px; }
      .top-nav .nav-active { border-color: ${COLORS.teal}; color: ${COLORS.tealDim}; font-weight: 700; }
      .bottom-nav { display: none; }
      @media (max-width: 720px) {
        .top-nav { display: none; }
        .shell-container { padding: 24px 16px 110px !important; }
        .bottom-nav {
          display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
          background: ${COLORS.surface}; border-top: 1px solid ${COLORS.border};
          box-shadow: 0 -4px 18px rgba(0,0,0,0.06);
          padding: 6px max(6px, env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left));
          justify-content: space-around;
        }
        .bottom-nav button {
          flex: 1; min-width: 0; min-height: 52px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          background: none; border: none; padding: 6px 2px; cursor: pointer;
          font-family: ${FONT_BODY}; font-size: 10px; font-weight: 500; color: ${COLORS.muted};
        }
        .bottom-nav button .bn-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .bottom-nav button.active { color: ${COLORS.teal}; font-weight: 700; }
      }
      /* 下部タブが6項目になったため、狭い画面ではラベルを一段小さくして収まりを良くする */
      @media (max-width: 400px) {
        .bottom-nav button { font-size: 9px; padding: 6px 1px; }
      }
      @media (max-width: 620px) {
        .two-col { grid-template-columns: 1fr !important; }
        .flow-step > div:last-child { font-size: 10px !important; }
        .stack-mobile { flex-direction: column !important; align-items: stretch !important; }
        .hide-mobile { display: none !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .fade-in, .pulse-dot { animation: none !important; }
        .btn-primary, .btn-ghost { transition: none !important; }
      }
    `}</style>
  );
}
