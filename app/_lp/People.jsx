"use client";

import { Label, Tag, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";
import Figure from "./Figure";

// 「誰なのか」より「何を経験したのか」を主役にする。
// 一般的な人材紹介サイトのプロフィールカード一覧にはしない。
// 氏名は実在の個人を特定しないイニシャル表記(登録者の例示であることを明記する)。
const PEOPLE = [
  { i: 1, exp: "売上 0→10億", detail: "属人化した営業を型にして、再現できるチームに作り替えた。", name: "S.M.", role: "元セールス責任者", career: "SaaS・人材 2社 / 実務18年", tags: ["セールス基盤", "経営体制"], offset: 0, span: "tall" },
  { i: 2, exp: "新規事業 3回", detail: "立ち上げから撤退判断まで、0→1を3度くぐっている。", name: "K.Y.", role: "元事業開発責任者", career: "製造・D2C 3社 / 実務15年", tags: ["プロダクト戦略"], offset: 72, span: "normal" },
  { i: 3, exp: "IPO 経験", detail: "管理会計の整備から監査対応まで、上場の実務を通した。", name: "T.E.", role: "元CFO室", career: "SaaS 1社 / 実務20年", tags: ["資金調達", "財務・管理会計"], offset: 24, span: "normal" },
  { i: 4, exp: "海外 5カ国展開", detail: "現地法人の立ち上げと、日本側との業務設計を担当。", name: "A.N.", role: "元海外事業部長", career: "商社・メーカー 2社 / 実務22年", tags: ["オペレーション"], offset: 96, span: "normal" },
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
                <p className="lp-body" style={{ marginTop: 10, fontSize: 13.5 }}>{p.detail}</p>
                <div className="lp-small" style={{ marginTop: 12, color: C.inkSoft, fontWeight: 700 }}>
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
