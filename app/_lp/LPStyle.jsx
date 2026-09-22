import { LP_COLOR as C, LP_FONT as F, LP_TYPE as T, LP_SPACE as S, LP_RADIUS as R, LP_MOTION as M, HOME_PLATE_CLIP } from "./tokens";

// LP専用のグローバルスタイル。すべてのLP用CSSをこの1箇所に集約する。
export default function LPStyle() {
  const css = `
      @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;800;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');

      /* ---- base ---- */
      .lp { font-family: ${F.jp}; color: ${C.ink}; background: ${C.white}; -webkit-font-smoothing: antialiased; overflow-x: clip; }
      .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
      /* color:inherit の特異度(0-1-1)がボタンのクラス(0-1-0)より高く、
         リンク型CTAの文字色をすべて上書きしてしまっていた。ボタンは除外する。 */
      .lp a { text-decoration: none; }
      .lp a:not(.lp-btn) { color: inherit; }
      .lp ::selection { background: ${C.orange}; color: #fff; }
      .lp :focus-visible { outline: 2px solid ${C.orange}; outline-offset: 3px; }

      /* ---- container / section ---- */
      .lp-wrap { max-width: ${S.container}px; margin: 0 auto; padding-left: ${S.gutter}; padding-right: ${S.gutter}; width: 100%; }
      .lp-wrap--narrow { max-width: ${S.containerNarrow}px; }
      .lp-sec { padding-top: ${S.section}; padding-bottom: ${S.section}; position: relative; scroll-margin-top: 92px; }
      .lp-sec--tight { padding-top: ${S.sectionTight}; padding-bottom: ${S.sectionTight}; }
      .on-ink { background: ${C.ink}; color: ${C.white}; }
      .on-orange { background: ${C.orange}; color: ${C.white}; }

      /* ---- type ---- */
      .lp-display { font-family: ${F.jp}; font-weight: 900; font-size: ${T.display}; line-height: 1.08; letter-spacing: -0.035em; margin: 0; line-break: strict; }
      .lp-giant   { font-family: ${F.jp}; font-weight: 900; font-size: ${T.giant};   line-height: 1.22; letter-spacing: -0.03em; margin: 0; line-break: strict; }
      .lp-head    { font-family: ${F.jp}; font-weight: 900; font-size: ${T.head};    line-height: 1.35; letter-spacing: -0.02em; margin: 0; }
      .lp-sub     { font-size: ${T.sub}; line-height: 1.95; font-weight: 500; margin: 0; color: ${C.inkSoft}; }
      .on-ink .lp-sub, .on-orange .lp-sub { color: rgba(255,255,255,0.78); }
      .lp-body    { font-size: ${T.body}; line-height: 2; margin: 0; color: ${C.inkSoft}; }
      .on-ink .lp-body, .on-orange .lp-body { color: rgba(255,255,255,0.72); }
      .lp-small   { font-size: ${T.small}; line-height: 1.85; color: ${C.inkFaint}; margin: 0; }
      /* 英字ラベル。字間を大きく開けて、巨大コピーとの落差を作る */
      .lp-label   { font-family: ${F.en}; font-weight: 600; font-size: ${T.label}; letter-spacing: 0.16em; text-transform: uppercase; display: inline-block; }
      .lp-label--orange { color: ${C.orange}; }
      .on-orange .lp-label--orange, .on-ink .lp-label--orange { color: ${C.white}; }
      .lp-num { font-family: ${F.en}; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
      .lp-en  { font-family: ${F.en}; }

      /* ---- brand shape: home plate ---- */
      .lp-plate { clip-path: ${HOME_PLATE_CLIP}; }
      .lp-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

      /* ---- buttons ---- */
      /* 典型的な丸いSaaSボタンにはしない。角はほぼ立て、矢印をブランド要素として統一する */
      .lp-btn {
        display: inline-flex; align-items: center; gap: 12px;
        font-family: ${F.jp}; font-weight: 700; font-size: 15px; line-height: 1;
        padding: 20px 28px; border-radius: ${R.xs}px; border: 1.5px solid transparent;
        cursor: pointer; transition: background ${M.fast}, color ${M.fast}, border-color ${M.fast};
        white-space: nowrap;
      }
      .lp-btn .lp-arrow { transition: transform ${M.fast}; flex-shrink: 0; }
      .lp-btn:hover .lp-arrow { transform: translateX(5px); }
      .lp-btn--primary { background: ${C.orange}; color: #fff; }
      .lp-btn--primary:hover { background: ${C.orangeDeep}; }
      .lp-btn--ghost { background: transparent; color: ${C.ink}; border-color: ${C.ink}; }
      .lp-btn--ghost:hover { background: ${C.ink}; color: #fff; }
      /* オレンジ面の上では白地×オレンジ文字に反転する */
      .lp-btn--onOrange { background: #fff; color: ${C.orange}; }
      .lp-btn--onOrange:hover { background: ${C.ink}; color: #fff; }
      .lp-btn--onInk { background: ${C.orange}; color: #fff; }
      .lp-btn--onInk:hover { background: #fff; color: ${C.ink}; }
      .lp-btn--sm { padding: 14px 20px; font-size: 13.5px; gap: 9px; }

      /* ---- header ---- */
      .lp-header { position: fixed; top: 0; left: 0; right: 0; z-index: 90; transition: background ${M.base}, border-color ${M.base}; border-bottom: 1px solid transparent; }
      .lp-header[data-stuck="true"] { background: rgba(255,255,255,0.92); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border-bottom-color: ${C.line}; }
      /* オレンジ面・黒面の上では、白い帯ではなくその地色をヘッダーに敷く。
         完全な透明にすると、下を流れるコピーやボタンとヘッダーが重なって読めなくなる。 */
      .lp-header[data-mode="dark"]   { background: rgba(18,18,20,0.90); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border-bottom-color: transparent; }
      .lp-header[data-mode="orange"] { background: rgba(244,105,25,0.94); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border-bottom-color: transparent; }
      .lp-header[data-oncolor="true"] .lp-navlink::after { background: #fff; }
      .lp-header-inner { display: flex; align-items: center; gap: 28px; height: 78px; }
      .lp-header-logo { height: 40px; width: auto; display: block; }
      .lp-navlink { font-size: 13.5px; font-weight: 500; color: ${C.ink}; position: relative; padding: 6px 0; }
      .lp-navlink::after { content: ""; position: absolute; left: 0; right: 100%; bottom: 0; height: 1.5px; background: ${C.orange}; transition: right ${M.fast}; }
      .lp-navlink:hover::after { right: 0; }

      /* ---- hero ---- */
      .lp-hero { min-height: min(100svh, 880px); display: flex; flex-direction: column; justify-content: center; padding-top: clamp(118px, 15vh, 172px); padding-bottom: clamp(56px, 7vh, 88px); position: relative; }
      .lp-hero-grid { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr); gap: clamp(30px, 4vw, 64px); align-items: center; }
      .lp-hero-cta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: clamp(30px, 3.6vw, 48px); }
      .lp-scrollcue { position: absolute; right: ${S.gutter}; bottom: 34px; display: flex; align-items: center; gap: 12px; color: ${C.inkFaint}; }
      .lp-scrollcue i { display: block; width: 46px; height: 1px; background: ${C.line}; position: relative; overflow: hidden; }
      .lp-scrollcue i::after { content: ""; position: absolute; inset: 0; background: ${C.orange}; animation: cue 2.6s ease-in-out infinite; }
      @keyframes cue { 0% { transform: translateX(-100%); } 55%,100% { transform: translateX(100%); } }

      /* Hero入場。BATTER BOX → その経験に、→ 次の打席を。の順で短く出す */
      .lp-rise { opacity: 0; transform: translateY(18px); animation: rise 780ms cubic-bezier(0.22,1,0.36,1) forwards; }
      @keyframes rise { to { opacity: 1; transform: none; } }

      /* ---- growth map preview (Hero右) ---- */
      .lp-gm { border: 1px solid ${C.line}; border-radius: ${R.sm}px; padding: 20px 22px 22px; background: ${C.white}; }
      .lp-gm-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
      .lp-gm-badge { font-size: 10.5px; font-weight: 700; color: ${C.orange}; border: 1px solid ${C.orange}; border-radius: ${R.xs}px; padding: 3px 8px; white-space: nowrap; }
      .lp-gm-score { display: flex; align-items: baseline; gap: 7px; margin-bottom: 6px; }
      .lp-gm-score-v { font-size: 40px; line-height: 1; color: ${C.ink}; }
      .lp-gm-score-u { font-size: 13px; color: ${C.inkFaint}; }
      .lp-gm-score-l { font-size: 12px; color: ${C.inkSoft}; margin-left: auto; }
      .lp-gm-svg { width: 100%; height: auto; display: block; }
      .lp-gm-legend { display: flex; gap: 18px; justify-content: center; font-size: 11px; color: ${C.inkSoft}; margin: 2px 0 16px; }
      .lp-gm-legend span { display: inline-flex; align-items: center; gap: 6px; }
      .lp-gm-legend i { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
      .lp-gm-issues { border-top: 1px solid ${C.line}; padding-top: 16px; }
      .lp-gm-issue { display: flex; align-items: center; gap: 9px; padding: 6px 0; }
      .lp-gm-issue-l { font-size: 12.5px; font-weight: 700; width: 92px; flex-shrink: 0; }
      .lp-gm-bar { flex: 1; height: 5px; background: ${C.line}; border-radius: 3px; overflow: hidden; min-width: 40px; }
      .lp-gm-bar i { display: block; height: 100%; background: ${C.orange}; border-radius: 3px; }
      .lp-gm-issue-s { font-size: 12px; color: ${C.inkSoft}; width: 22px; text-align: right; }

      /* ---- marquee ---- */
      .lp-marquee { overflow: hidden; display: flex; user-select: none; }
      .lp-marquee-track { display: flex; flex-shrink: 0; align-items: center; gap: 52px; padding-right: 52px; animation: marquee 46s linear infinite; }
      @keyframes marquee { to { transform: translateX(-100%); } }
      .lp-marquee-item { font-family: ${F.en}; font-weight: 800; font-size: clamp(20px, 2.6vw, 36px); letter-spacing: -0.01em; white-space: nowrap; display: flex; align-items: center; gap: 52px; }
      .lp-marquee-item::after { content: ""; width: 11px; height: 13px; background: currentColor; clip-path: ${HOME_PLATE_CLIP}; opacity: 0.65; flex-shrink: 0; }

      /* ---- problem: 実際に起きている症状 ---- */
      .lp-issues { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 1px solid ${C.ink}; }
      .lp-issue { padding: 22px clamp(16px, 2vw, 30px) 24px 0; border-bottom: 1px solid ${C.line}; }
      .lp-issue-w { font-size: clamp(18px, 1.9vw, 24px); font-weight: 900; letter-spacing: -0.03em; margin-bottom: 9px; }
      .lp-issue-t { font-size: 13.5px; color: ${C.inkSoft}; line-height: 1.85; }
      .lp-issue-axis { font-size: 10.5px; font-family: ${F.en}; letter-spacing: 0.06em; color: ${C.orange}; margin-top: 12px; }

      /* ---- facts(数字の面) ---- */
      .lp-facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(20px, 3vw, 48px); }
      .lp-fact-v { display: flex; align-items: baseline; gap: 5px; }
      .lp-fact-v .lp-num { font-size: clamp(38px, 5vw, 66px); line-height: 1; letter-spacing: -0.04em; }
      .lp-fact-u { font-size: clamp(13px, 1.2vw, 16px); font-weight: 700; color: ${C.orange}; }
      .lp-fact-l { font-size: 12.5px; color: ${C.inkSoft}; line-height: 1.75; margin-top: 10px; }

      /* ---- compare(正社員採用との対比) ---- */
      .lp-cmp { border-top: 1px solid ${C.ink}; }
      .lp-cmp-row { display: grid; grid-template-columns: 96px 1fr 1fr; gap: clamp(14px, 2.4vw, 40px); padding: 17px 0; border-bottom: 1px solid ${C.line}; align-items: baseline; }
      .lp-cmp-head { border-bottom-color: ${C.line}; padding-bottom: 12px; }
      .lp-cmp-head span { font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; }
      .lp-cmp-k { font-size: 12px; font-weight: 700; color: ${C.inkFaint}; }
      .lp-cmp-a { font-size: 14px; color: ${C.inkFaint}; line-height: 1.8; }
      .lp-cmp-b { font-size: 14.5px; color: ${C.ink}; font-weight: 700; line-height: 1.8; }
      .lp-cmp-head .lp-cmp-b { color: ${C.orange}; }

      /* ---- after matching ---- */
      .lp-after { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(28px, 4vw, 56px) clamp(32px, 5vw, 72px); }
      .lp-after-item { display: grid; grid-template-columns: 96px 1fr; gap: clamp(14px, 2vw, 26px); align-items: start; }
      .lp-after-n { display: flex; align-items: baseline; gap: 3px; border-top: 2px solid ${C.orange}; padding-top: 12px; }
      .lp-after-n .lp-num { font-size: 34px; line-height: 1; letter-spacing: -0.04em; }
      .lp-after-u { font-size: 12px; font-weight: 700; color: ${C.inkSoft}; }
      .lp-after-t { font-size: 16.5px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.5; }

      /* ---- faq ---- */
      .lp-faq-grid { display: grid; grid-template-columns: minmax(0, 0.74fr) minmax(0, 1.26fr); gap: clamp(32px, 5vw, 80px); align-items: start; }
      .lp-faq details { border-top: 1px solid ${C.line}; }
      .lp-faq details:last-child { border-bottom: 1px solid ${C.line}; }
      .lp-faq summary { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px 0; cursor: pointer; list-style: none; font-size: 15.5px; font-weight: 700; line-height: 1.7; }
      .lp-faq summary::-webkit-details-marker { display: none; }
      .lp-faq summary i { width: 13px; height: 13px; flex-shrink: 0; position: relative; }
      .lp-faq summary i::before, .lp-faq summary i::after { content: ""; position: absolute; background: ${C.orange}; transition: transform ${M.fast}; }
      .lp-faq summary i::before { left: 0; right: 0; top: 6px; height: 1.5px; }
      .lp-faq summary i::after { top: 0; bottom: 0; left: 6px; width: 1.5px; }
      .lp-faq details[open] summary i::after { transform: scaleY(0); }
      .lp-faq details > p { padding: 0 0 22px; max-width: 62ch; }

      /* ---- scroll reveal ---- */
      .lp-reveal { opacity: 0; transform: translateY(26px); transition: opacity ${M.slow}, transform ${M.slow}; }
      .lp-reveal[data-shown="true"] { opacity: 1; transform: none; }

      /* ---- experience tag (home plate) ---- */
      .lp-tag { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; padding: 9px 15px 13px; border-radius: ${R.xs}px; }
      .lp-tag::before { content: ""; width: 9px; height: 11px; background: currentColor; clip-path: ${HOME_PLATE_CLIP}; flex-shrink: 0; }

      /* ---- AI demo ---- */
      .lp-ai-input { display: flex; gap: 0; border: 1.5px solid ${C.lineOnInk}; border-radius: ${R.xs}px; background: rgba(255,255,255,0.04); }
      .lp-ai-input input {
        flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #fff;
        font-family: ${F.jp}; font-size: clamp(15px, 1.5vw, 19px); font-weight: 500; padding: 26px 26px;
      }
      .lp-ai-input input::placeholder { color: rgba(255,255,255,0.4); }
      .lp-ai-input:focus-within { border-color: ${C.orange}; }
      .lp-ai-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(20px, 3vw, 44px); margin-top: 34px; padding-top: 28px; border-top: 1px solid ${C.lineOnInk}; }
      .lp-ai-prev-item { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: start; }
      .lp-ai-prev-t { font-size: 15px; font-weight: 900; letter-spacing: -0.02em; color: #fff; }
      .lp-ai-prev-d { font-size: 13px; line-height: 1.85; color: rgba(255,255,255,0.58); margin: 7px 0 0; }
      .lp-ai-stage { border-top: 1px solid ${C.lineOnInk}; }
      .lp-ai-row { display: grid; grid-template-columns: 54px 1fr; gap: 20px; padding: 22px 0; border-bottom: 1px solid ${C.lineOnInk}; align-items: start; }
      .lp-dots span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${C.orange}; margin-right: 6px; animation: blink 1.25s ease-in-out infinite; }
      .lp-dots span:nth-child(2) { animation-delay: 0.18s; }
      .lp-dots span:nth-child(3) { animation-delay: 0.36s; }
      @keyframes blink { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }

      /* ---- people ---- */
      /* 人物写真が未登録の間は、ブランド造形(ニアブラック/オレンジの面+五角形)で代替する。
         public/people/0N.jpg を置くと自動で写真に切り替わる。 */
      .lp-figure { position: relative; aspect-ratio: 3 / 4; overflow: hidden; background: ${C.ink}; border-radius: ${R.xs}px; }
      .lp-figure img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .lp-figure-fallback { position: absolute; inset: 0; display: flex; align-items: flex-end; padding: 24px; }
      .lp-figure-plate { position: absolute; right: -14%; top: -8%; width: 68%; aspect-ratio: 1 / 1.15; background: ${C.orange}; clip-path: ${HOME_PLATE_CLIP}; opacity: 0.9; }

      /* ---- how it works ---- */
      .lp-how { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); gap: clamp(32px, 6vw, 96px); align-items: start; }
      .lp-how-rail { position: sticky; top: 132px; }
      .lp-how-step { display: grid; grid-template-columns: 54px 1fr; gap: 18px; padding: 18px 0; border-top: 1px solid ${C.line}; transition: opacity ${M.base}; opacity: 0.34; }
      .lp-how-step[data-active="true"] { opacity: 1; }
      .lp-how-panel { min-height: 0; display: flex; flex-direction: column; justify-content: center; border-top: 1px solid ${C.line}; padding: clamp(30px, 4vw, 52px) 0; }

      .lp-how-out { list-style: none; margin: 20px 0 0; padding: 0; display: flex; flex-direction: column; gap: 9px; max-width: 600px; }
      .lp-how-out li { font-size: 13.5px; color: ${C.inkSoft}; line-height: 1.8; padding-left: 18px; position: relative; }
      .lp-how-out li::before { content: ""; position: absolute; left: 0; top: 9px; width: 8px; height: 9px; background: ${C.orange}; clip-path: ${HOME_PLATE_CLIP}; }

      /* ---- two sides ---- */
      .lp-two { display: flex; min-height: 78svh; }
      .lp-two-side { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: clamp(48px, 7vw, 96px) ${S.gutter}; transition: flex-grow ${M.base}, background ${M.base}; border-left: 1px solid ${C.lineOnInk}; }
      .lp-two-side:first-child { border-left: none; }
      .lp-two:hover .lp-two-side { flex-grow: 0.86; }
      .lp-two .lp-two-side:hover { flex-grow: 1.28; background: rgba(255,255,255,0.04); }

      /* ---- footer ---- */
      .lp-footer-links { display: flex; gap: 26px; flex-wrap: wrap; font-size: 13px; color: ${C.inkSoft}; }
      .lp-footer-links a:hover { color: ${C.orange}; }

      /* ---- mobile ---- */
      /* モバイルは別レイアウトとして設計する。人物を横に詰め込まず、縦と横スワイプで見せる */
      .lp-mobile-cta { display: none; }
      .lp-hswipe { display: grid; }
      @media (max-width: 900px) {
        .lp-hero-grid { grid-template-columns: 1fr; gap: 34px; }
        .lp-how { grid-template-columns: 1fr; gap: 28px; }
        .lp-how-rail { position: static; }
        .lp-how-panel { min-height: 0; }
        .lp-two { flex-direction: column; min-height: 0; }
        .lp-two-side { border-left: none; border-top: 1px solid ${C.lineOnInk}; }
        .lp-two:hover .lp-two-side, .lp-two .lp-two-side:hover { flex-grow: 1; background: transparent; }
      }
      @media (max-width: 640px) {
        .lp-header-inner { height: 64px; gap: 14px; }
        .lp-header-logo { height: 32px; }
        .lp-hero { min-height: 0; padding-top: 96px; padding-bottom: 48px; }
        .lp-hero-cta { flex-direction: column; align-items: stretch; }
        .lp-hero-cta .lp-btn { justify-content: center; padding: 19px 22px; } /* 親指で押しやすい高さ */
        /* モバイルでは打席の図版を控えめに。最初の数スクロールでAI入力まで到達させる */
        .lp-hero-art { max-width: 260px; margin: 0 auto; }
        .lp-scrollcue { display: none; }
        .lp-nav-desktop { display: none !important; }
        .lp-ai-input { flex-direction: column; align-items: stretch; }
        .lp-ai-input input { padding: 20px 18px; }
        .lp-ai-row { grid-template-columns: 40px 1fr; gap: 14px; }
        /* 人物は横スワイプで見せる */
        .lp-hswipe { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; margin-left: calc(-1 * ${S.gutter}); margin-right: calc(-1 * ${S.gutter}); padding: 0 ${S.gutter} 6px; scrollbar-width: none; }
        .lp-hswipe::-webkit-scrollbar { display: none; }
        .lp-hswipe > * { flex: 0 0 72%; scroll-snap-align: start; padding-top: 0 !important; }
        .lp-mobile-cta {
          display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 95; gap: 10px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid ${C.line};
          padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
        }
        .lp-mobile-cta .lp-btn { flex: 1; justify-content: center; padding: 16px 12px; font-size: 13.5px; }
        .lp-has-mobile-cta { padding-bottom: 82px; }
      }

      /* ---- モバイルの可読性の下限 ----
         情報量を増やしても、本文15px・補助13px・ラベル11px・タップ48pxは下回らせない。
         入力欄はiOSのズームを避けるため16px以上を保つ。 */
      @media (max-width: 640px) {
        .lp-body   { font-size: 15px; line-height: 1.95; }
        .lp-sub    { font-size: 16.5px; line-height: 1.9; }
        .lp-small  { font-size: 13px; line-height: 1.8; }
        .lp-label  { font-size: 11px; }
        .lp-btn    { min-height: 52px; font-size: 15px; }
        .lp-btn--sm { min-height: 44px; font-size: 13.5px; }
        .lp-ai-input input { font-size: 16px; }
        /* タップできるものは48px以上を確保する */
        .lp-navlink, .lp-footer-links a, .lp-faq summary { min-height: 48px; display: flex; align-items: center; }
        .lp-two-side { min-height: 0; }
        /* 自分で決めた下限(11px)を割っていた箇所を、モバイルでは引き上げる */
        .lp-gm-badge, .lp-issue-axis, .lp-gm .lp-label, .lp-gm-legend { font-size: 11.5px !important; }
        .lp-gm-issue-s, .lp-gm-issue .lp-num { font-size: 11.5px; }
        /* ロゴのリンクも指で押せる大きさを確保する */
        .lp-header-inner > a { min-height: 44px; display: flex; align-items: center; }
        .lp-figure-fallback .lp-en, .lp-how-step .lp-label { font-size: 11px !important; }
        .lp-facts { grid-template-columns: repeat(2, 1fr); gap: 26px 20px; }
        .lp-issues { grid-template-columns: 1fr; }
        .lp-ai-preview { grid-template-columns: 1fr; gap: 20px; }
        .lp-ai-prev-d { font-size: 13px; }
        .lp-issue { padding-right: 0; }
        .lp-cmp-row { grid-template-columns: 1fr; gap: 4px; padding: 14px 0; }
        .lp-cmp-head { display: none; }
        .lp-cmp-a::before { content: "正社員採用: "; color: ${C.inkFaint}; font-weight: 700; }
        .lp-cmp-b::before { content: "BATTER BOX: "; color: ${C.orange}; font-weight: 700; }
        .lp-after { grid-template-columns: 1fr; gap: 26px; }
        .lp-after-item { grid-template-columns: 74px 1fr; gap: 16px; }
        .lp-faq-grid { grid-template-columns: 1fr; gap: 28px; }
        .lp-gm { padding: 16px 16px 18px; }
        .lp-gm-issue-l { width: 78px; font-size: 12px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .lp *, .lp *::before, .lp *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        .lp-reveal { opacity: 1; transform: none; }
        .lp-rise { opacity: 1; transform: none; }
      }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
