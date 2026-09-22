"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Label, Tag, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";
import Figure from "./Figure";

// LP上で診断の流れを疑似体験してもらうためのデモ。
// 実際の診断(/diagnose)はAIとの5問の対話形式で、ここでの結果は固定の例示。
// 誤解を生まないよう画面上に明記する。
const DEMO_PLACEHOLDER = "いま抱えている経営課題を教えてください";
const DEMO_SAMPLE = "新規事業を立ち上げたが、なかなか売上が伸びない";

const DEMO_RESULT = {
  issues: ["新規事業", "PMF前フェーズ", "初期営業"],
  needed: [
    { n: "01", label: "BtoB新規事業 0→1", note: "立ち上げ期の仮説検証とチャネル設計を経験している" },
    { n: "02", label: "初期営業組織構築", note: "最初の営業プロセスと型づくりを主導した経験" },
    { n: "03", label: "PMF検証", note: "顧客の課題と提供価値のズレを見極めた経験" },
  ],
  matched: [
    { id: 1, headline: "売上 0→10億", role: "元セールス責任者", tags: ["セールス基盤"] },
    { id: 2, headline: "新規事業 3回", role: "元事業開発責任者", tags: ["プロダクト戦略"] },
    { id: 3, headline: "PMF検証 8件", role: "元プロダクト責任者", tags: ["カスタマーサクセス"] },
  ],
};

export default function AIExperience() {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | analyzing | result
  const [touched, setTouched] = useState(false);
  const [typed, setTyped] = useState("");
  const timers = useRef([]);

  // プレースホルダーに入力例を1文字ずつ流す。ユーザーが触ったら止める。
  useEffect(() => {
    if (touched) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(DEMO_SAMPLE);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(DEMO_SAMPLE.slice(0, i));
      if (i >= DEMO_SAMPLE.length) clearInterval(id);
    }, 62);
    return () => clearInterval(id);
  }, [touched]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = () => {
    if (phase === "analyzing") return;
    setPhase("analyzing");
    timers.current.push(setTimeout(() => setPhase("result"), 1500));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase("idle");
  };

  return (
    <section className="lp-sec on-ink" id="ai" data-tone="dark">
      <Wrap>
        <Reveal>
          <Label tone="plain" style={{ color: C.orange, marginBottom: 22 }}>AI Analysis</Label>
          <h2 className="lp-giant">
            あなたの会社に、<br />足りない経験は？
          </h2>
        </Reveal>

        <Reveal delay={90} style={{ marginTop: "clamp(34px, 4vw, 56px)", maxWidth: 940 }}>
          <div className="lp-ai-input">
            <input
              value={value}
              onChange={(e) => { setValue(e.target.value); setTouched(true); }}
              onFocus={() => setTouched(true)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder={touched ? DEMO_PLACEHOLDER : typed || DEMO_PLACEHOLDER}
              aria-label={DEMO_PLACEHOLDER}
            />
            <div style={{ padding: 10, display: "flex", alignItems: "center" }}>
              <Btn variant="onInk" onClick={run}>必要な経験を見つける</Btn>
            </div>
          </div>

          {phase !== "idle" && (
            <div className="lp-ai-stage" style={{ marginTop: 34 }}>
              {/* 1. 解析中 */}
              <div className="lp-ai-row">
                <span className="lp-label" style={{ color: C.orange, paddingTop: 3 }}>01</span>
                <div>
                  {phase === "analyzing" ? (
                    <span className="lp-en" style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.02em" }}>
                      <span className="lp-dots"><span /><span /><span /></span> Analyzing...
                    </span>
                  ) : (
                    <>
                      <div className="lp-label" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>経営課題</div>
                      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                        {DEMO_RESULT.issues.map((t) => <Tag key={t} tone="onInk">{t}</Tag>)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 必要な経験 */}
              {phase === "result" && (
                <>
                  <div className="lp-ai-row">
                    <span className="lp-label" style={{ color: C.orange, paddingTop: 3 }}>02</span>
                    <div>
                      <div className="lp-label" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Needed Experience</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {DEMO_RESULT.needed.map((x) => (
                          <div key={x.n} style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
                            <span className="lp-num" style={{ fontSize: 13, color: C.orange, minWidth: 22 }}>{x.n}</span>
                            <span style={{ fontSize: "clamp(18px, 2.2vw, 26px)", fontWeight: 900, letterSpacing: "-0.02em" }}>{x.label}</span>
                            <span className="lp-small" style={{ color: "rgba(255,255,255,0.5)" }}>{x.note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. 該当する経験を持つ人 */}
                  <div className="lp-ai-row" style={{ borderBottom: "none" }}>
                    <span className="lp-label" style={{ color: C.orange, paddingTop: 3 }}>03</span>
                    <div style={{ width: "100%" }}>
                      <div className="lp-label" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Matched Experiences</div>
                      <div className="lp-hswipe" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {DEMO_RESULT.matched.map((m, i) => (
                          <div key={m.id}>
                            <Figure index={i + 1} headline={m.headline} onInk />
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.headline}</div>
                              <div className="lp-small" style={{ color: "rgba(255,255,255,0.5)" }}>{m.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 30 }}>
                        <Btn href="/diagnose" variant="onInk">実際に診断を受ける</Btn>
                        <button onClick={reset} className="lp-en" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" }}>
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="lp-small" style={{ color: "rgba(255,255,255,0.4)", marginTop: 22 }}>
            ※ これはLP上のデモです。実際の診断はAIとの5問の対話形式で行い、10軸のスコアと課題TOP3を算出します。
          </p>
        </Reveal>
      </Wrap>
    </section>
  );
}
