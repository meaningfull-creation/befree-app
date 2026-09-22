"use client";

import { useEffect, useRef, useState } from "react";
import { Label, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";

// 4枚のカードを横並びにするのではなく、スクロールにつれて体験が
// 01 → 02 → 03 → 04 と進んでいく形にする。左のレールが現在地を示す。
const STEPS = [
  { n: "01", t: "課題を入力", d: "「新規事業の売上が伸びない」のように、いま向き合っている経営課題を、そのままの言葉で入力します。専門用語に言い換える必要はありません。", en: "Input" },
  { n: "02", t: "AIが分析", d: "業種・成長段階・組織の状況を踏まえて、AIが5つの質問を重ねます。3分ほどで終わる短い対話です。", en: "Analyze" },
  { n: "03", t: "必要な経験を特定", d: "10軸のスコアで会社の状態を可視化し、成長を止めている課題TOP3と、それを解くために必要な経験を言語化します。", en: "Identify" },
  { n: "04", t: "経験人材とマッチング", d: "その経験を持つ実務経験者を、マッチ度の根拠つきで提案。月10時間から、業務委託でチームに加わります。", en: "Match" },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const panelRefs = useRef([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.idx));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    panelRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="lp-sec" id="about">
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(40px, 5vw, 72px)" }}>
          <Label style={{ marginBottom: 22 }}>How it works</Label>
          <h2 className="lp-giant">課題から、<br />経験にたどり着く。</h2>
        </Reveal>

        <div className="lp-how">
          {/* 左: 現在地を示すレール */}
          <div className="lp-how-rail">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-how-step" data-active={i === active}>
                <span className="lp-num" style={{ fontSize: 13, color: i === active ? C.orange : C.inkFaint, paddingTop: 5 }}>{s.n}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>{s.t}</div>
                  <span className="lp-label" style={{ color: C.inkFaint, fontSize: 10 }}>{s.en}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.line}` }} />
          </div>

          {/* 右: スクロールで進む本体 */}
          <div>
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                ref={(el) => (panelRefs.current[i] = el)}
                data-idx={i}
                className="lp-how-panel"
              >
                <span className="lp-num" style={{ fontSize: "clamp(56px, 9vw, 132px)", color: i === active ? C.orange : C.line, lineHeight: 0.9, transition: "color 420ms cubic-bezier(0.22,1,0.36,1)" }}>
                  {s.n}
                </span>
                <h3 className="lp-head" style={{ marginTop: 22 }}>{s.t}</h3>
                <p className="lp-body" style={{ marginTop: 16, maxWidth: 560 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
