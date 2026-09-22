"use client";

import { Btn, Label, Wrap } from "./parts";
import { LP_COLOR as C, HOME_PLATE_CLIP } from "./tokens";

// バッターボックスの幾何学。白線で描かれたボックスとホームベース。
// 写真素材に頼らず、ブランド固有の造形だけでファーストビューを成立させる。
function PlateGraphic() {
  return (
    <div className="lp-hero-art" style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", maxWidth: 560, marginLeft: "auto" }}>
      <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
        <defs>
          <clipPath id="bbPlate" clipPathUnits="objectBoundingBox">
            <polygon points="0,0 1,0 1,0.62 0.5,1 0,0.62" />
          </clipPath>
        </defs>
        {/* 打席の白線(左右のバッターボックス) */}
        <g stroke={C.line} strokeWidth="1.5" fill="none">
          <rect x="34" y="66" width="128" height="238" />
          <rect x="238" y="66" width="128" height="238" />
        </g>
        {/* 外周の極細ガイド */}
        <g stroke={C.line} strokeWidth="1" fill="none" opacity="0.7">
          <line x1="0" y1="185" x2="400" y2="185" />
          <line x1="200" y1="0" x2="200" y2="400" strokeDasharray="3 7" />
        </g>
        {/* ホームベース。ブランドのシンボル形状 */}
        <polygon points="160,150 240,150 240,200 200,236 160,200" fill={C.orange} />
        {/* 次打者を示す小さなマーカー */}
        <circle cx="200" cy="330" r="21" fill="none" stroke={C.orange} strokeWidth="1.5" />
        <circle cx="200" cy="330" r="4.5" fill={C.orange} />
      </svg>
      <span
        className="lp-en"
        style={{
          position: "absolute", left: "50%", bottom: "2%", transform: "translateX(-50%)",
          fontSize: 10.5, letterSpacing: "0.22em", fontWeight: 600, color: C.inkFaint, whiteSpace: "nowrap",
        }}
      >
        ON DECK
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="lp-hero">
      <Wrap>
        <div className="lp-hero-grid">
          <div>
            <div className="lp-rise" style={{ animationDelay: "60ms" }}>
              <Label style={{ marginBottom: 26 }}>Experience moves business.</Label>
            </div>

            {/* 画面の30〜50%をコピーが占める。1行ずつ短く出す */}
            <h1 className="lp-display">
              <span className="lp-rise" style={{ display: "block", animationDelay: "180ms" }}>その経験に、</span>
              <span className="lp-rise" style={{ display: "block", animationDelay: "320ms" }}>
                次の<span style={{ color: C.orange }}>打席</span>を。
              </span>
            </h1>

            <div className="lp-rise" style={{ animationDelay: "480ms", marginTop: "clamp(26px, 3vw, 40px)", maxWidth: 620 }}>
              <p className="lp-sub" style={{ color: C.ink, fontWeight: 700 }}>
                企業に足りないのは、人ではなく「経験」かもしれない。
              </p>
              <p className="lp-body" style={{ marginTop: 14 }}>
                AIが経営課題を分析し、いま必要な経験を持つ人と企業をつなぐ。
              </p>
            </div>

            <div className="lp-hero-cta lp-rise" style={{ animationDelay: "580ms" }}>
              <Btn href="/diagnose">企業として経験を探す</Btn>
              <Btn href="/join" variant="ghost">経験を登録する</Btn>
            </div>
          </div>

          <div className="lp-rise" style={{ animationDelay: "700ms" }}>
            <PlateGraphic />
          </div>
        </div>
      </Wrap>

      <div className="lp-scrollcue lp-rise" style={{ animationDelay: "900ms" }}>
        <span className="lp-label">Scroll</span>
        <i />
      </div>
    </section>
  );
}
