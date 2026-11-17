"use client";

import { Btn, Wrap } from "./parts";
import { LP_COLOR as C } from "./tokens";
import GrowthMap from "./GrowthMap";

export default function Hero() {
  return (
    <section className="lp-hero">
      <Wrap>
        <div className="lp-hero-grid">
          <div>
            {/* 画面の30〜50%をコピーが占める。1行ずつ短く出す */}
            <h1 className="lp-display">
              <span className="lp-rise" style={{ display: "block", animationDelay: "180ms" }}>その経験に、</span>
              <span className="lp-rise" style={{ display: "block", animationDelay: "320ms" }}>
                次の<span style={{ color: C.orange }}>打席</span>を。
              </span>
            </h1>

            {/* v6.17: 「HPだけだと何をしている会社なのか分かりにくい」というご指摘への対応。
                ブランドコピーの次に、何をするサービスなのかを一文で言い切る。
                そのうえで、聞かれる前に答えが要る3点(無料・最小単位・費用の発生時点)を並べる。 */}
            <div className="lp-rise" style={{ animationDelay: "480ms", marginTop: "clamp(26px, 3vw, 40px)", maxWidth: 640 }}>
              <p className="lp-sub" style={{ color: C.ink, fontWeight: 700 }}>
                経営課題をAIが5問で診断し、その課題を解いてきた人を紹介するサービスです。
              </p>
              <p className="lp-body" style={{ marginTop: 14 }}>
                正社員を一人採るには重いけれど、その経験がなければ前に進まない。
                そんな課題に、月10時間からの業務委託で経験者が加わります。
              </p>

              <ul className="lp-hero-facts">
                <li><b>診断は無料</b>カード登録も不要</li>
                <li><b>月10時間から</b>本業と並行でも</li>
                <li><b>費用は契約成立後</b>話すだけなら無料</li>
              </ul>
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
