"use client";

import { Btn, Label, Wrap } from "./parts";
import { LP_COLOR as C } from "./tokens";
import GrowthMap from "./GrowthMap";

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
            <GrowthMap />
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
