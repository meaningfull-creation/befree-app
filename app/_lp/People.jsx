"use client";

import { Label, Tag, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";
import Figure from "./Figure";

// 「誰なのか」より「何を経験したのか」を主役にする。
// 一般的な人材紹介サイトのプロフィールカード一覧にはしない。
// 氏名は実在の個人を特定しないイニシャル表記(登録者の例示であることを明記する)。
const PEOPLE = [
  { i: 1, exp: "売上 0→10億", name: "S.M.", role: "元セールス責任者", career: "SaaS・人材 2社", tags: ["セールス基盤", "経営体制"], offset: 0, span: "tall" },
  { i: 2, exp: "新規事業 3回", name: "K.Y.", role: "元事業開発責任者", career: "製造・D2C 3社", tags: ["プロダクト戦略"], offset: 72, span: "normal" },
  { i: 3, exp: "IPO 経験", name: "T.E.", role: "元CFO室", career: "SaaS 1社", tags: ["資金調達", "財務・管理会計"], offset: 24, span: "normal" },
  { i: 4, exp: "海外 5カ国展開", name: "A.N.", role: "元海外事業部長", career: "商社・メーカー 2社", tags: ["オペレーション"], offset: 96, span: "normal" },
];

export default function People() {
  return (
    <section className="lp-sec">
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(44px, 6vw, 84px)" }}>
          <Label style={{ marginBottom: 22 }}>The People</Label>
          <h2 className="lp-giant">
            経験は、<br />会社の中だけに<br />あるものじゃない。
          </h2>
        </Reveal>

        {/* 千鳥配置。横一列に綺麗に並べず、サイズと高さに差をつける */}
        <div className="lp-hswipe" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "clamp(16px, 2vw, 28px)", alignItems: "start" }}>
          {PEOPLE.map((p, idx) => (
            <Reveal key={p.i} delay={idx * 90} style={{ paddingTop: p.offset }}>
              {/* 経験を最初に、最も大きく見せる */}
              <Figure index={p.i} headline={p.exp} ratio={p.span === "tall" ? "3 / 4.5" : "3 / 4"} />
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: "clamp(19px, 2vw, 26px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.25 }}>
                  {p.exp}
                </div>
                <div className="lp-small" style={{ marginTop: 10, color: C.inkSoft }}>
                  {p.name}／{p.role}
                </div>
                <div className="lp-small">{p.career}</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
                  {p.tags.map((t) => <Tag key={t} tone="outline">{t}</Tag>)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="lp-small" style={{ marginTop: 34 }}>
          ※ 登録されている経験の例です。氏名はイニシャルで表記しています。
        </p>
      </Wrap>
    </section>
  );
}
