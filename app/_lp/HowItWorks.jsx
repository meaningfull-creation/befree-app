"use client";

import { useEffect, useRef, useState } from "react";
import { Label, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";

// 4枚のカードを横並びにするのではなく、スクロールにつれて体験が
// 01 → 02 → 03 → 04 と進んでいく形にする。左のレールが現在地を示す。
const STEPS = [
  {
    n: "01", en: "Input", t: "課題を入力",
    d: "「新規事業の売上が伸びない」のように、いま向き合っている経営課題を、そのままの言葉で入力します。専門用語に言い換える必要はありません。",
    out: ["会社の基本情報(業種・従業員数・成長段階)", "いま困っていることの記述", "所要時間 約30秒"],
  },
  {
    n: "02", en: "Analyze", t: "AIが5問を重ねる",
    d: "業種と成長段階に合わせて、AIが質問を組み立てます。回答するたびに次の質問が変わる対話形式で、5問・約3分で終わります。",
    out: ["業種ごとに変わる質問", "回答に応じた掘り下げ", "気になる項目は後から追加で深掘り可能"],
  },
  {
    n: "03", en: "Identify", t: "必要な経験を特定",
    d: "10軸のスコアで会社の状態を可視化し、成長を止めている課題TOP3と、それを解くために必要な経験を言語化します。ここまで無料です。",
    out: ["10軸のGrowth Mapと総合スコア", "課題TOP3(現状・放置した場合のリスク・優先度)", "なぜその点数なのかの根拠"],
  },
  {
    n: "04", en: "Match", t: "経験を持つ人と出会う",
    d: "その経験を持つ実務経験者を、マッチ度の内訳つきで提案します。月10時間から、業務委託でチームに加わります。",
    out: ["候補ごとのマッチ度と、その内訳6項目", "解決できる課題領域のタグ", "そのままメッセージで会話を開始"],
  },
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
                <span className="lp-num" style={{ fontSize: "clamp(48px, 6.4vw, 96px)", color: i === active ? C.orange : C.line, lineHeight: 0.9, transition: "color 420ms cubic-bezier(0.22,1,0.36,1)" }}>
                  {s.n}
                </span>
                <h3 className="lp-head" style={{ marginTop: 18 }}>{s.t}</h3>
                <p className="lp-body" style={{ marginTop: 14, maxWidth: 600 }}>{s.d}</p>
                <ul className="lp-how-out">
                  {s.out.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
