// BATTER BOXのユーザー向け画面共通デザイントークン。
// 「野球のバッターボックス」をモチーフにしたロゴ(ネイビー×オレンジ)に合わせて、
// サイト全体の配色をそのブランドカラーへ統一している。
// キー名(teal/tealDim/amber等)は初期実装からの互換のため維持しているが、
// 値そのものはロゴから抽出したネイビー×オレンジのパレットになっている。
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
};
export const FONT_DISPLAY = "'M PLUS Rounded 1c', sans-serif";
export const FONT_BODY = "'Zen Kaku Gothic New', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      .app-root { font-family: ${FONT_BODY}; background: ${COLORS.bg}; color: ${COLORS.text}; min-height: 100vh; width: 100%; position: relative; overflow-x: hidden; }
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
      @media (max-width: 620px) {
        .two-col { grid-template-columns: 1fr !important; }
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
