import { getCurrentUser } from "@/lib/auth";
import LPStyle from "./_lp/LPStyle";
import Header from "./_lp/Header";
import Hero from "./_lp/Hero";
import AIExperience from "./_lp/AIExperience";
import People from "./_lp/People";
import HowItWorks from "./_lp/HowItWorks";
import { Arrow, Btn, Label, Reveal, Wordmark, Wrap } from "./_lp/parts";
import { EXPERIENCE_MARQUEE, LP_COLOR as C } from "./_lp/tokens";
import { Facts, Compare, AfterMatch, Faq } from "./_lp/Content";

export const metadata = {
  title: "BATTER BOX — その経験に、次の打席を。",
  description:
    "企業に足りないのは、人ではなく「経験」かもしれない。AIが経営課題を分析し、いま必要な経験を持つ人と企業をつなぐプラットフォーム、BATTER BOX。",
};

// 02｜EXPERIENCE MARQUEE
// 装飾ではなく「世の中には様々な経験がある」という思想を伝える要素。
function Marquee() {
  const row = (
    <div className="lp-marquee-track" aria-hidden="true">
      {EXPERIENCE_MARQUEE.map((t) => (
        <span key={t} className="lp-marquee-item">{t}</span>
      ))}
    </div>
  );
  return (
    <section className="on-orange" data-tone="orange" style={{ padding: "clamp(22px, 2.6vw, 34px) 0" }}>
      <div className="lp-marquee">{row}{row}</div>
      <span className="lp-sr">
        新規事業・営業・IPO・マーケティング・海外展開・採用・財務・プロダクト・経営・DXなど、様々な経験が登録されています。
      </span>
    </section>
  );
}

// 04｜THE PROBLEM — カードを並べず、文字と余白だけで成立させる
function Problem() {
  return (
    <section className="lp-sec">
      <Wrap>
        <Reveal>
          <Label style={{ marginBottom: 26 }}>The Problem</Label>
          <h2 className="lp-giant">
            採用するほどじゃない。<br />
            でも、<span style={{ color: C.orange }}>その経験</span>が必要だ。
          </h2>
        </Reveal>

        <Reveal delay={120} style={{ marginTop: "clamp(40px, 5vw, 72px)" }}>
          <p className="lp-sub" style={{ maxWidth: 620, marginBottom: "clamp(32px, 4vw, 52px)" }}>
            企業には、その瞬間だけ必要になる経験があります。正社員を一人採るには重すぎて、
            けれど誰かの経験がなければ前に進まない。その隙間を埋めるのが、BATTER BOXです。
          </p>

          {/* 抽象的な単語の羅列で終わらせず、実際に起きている症状まで書く */}
          <div className="lp-issues">
            {[
              { axis: "セールス基盤", w: "営業組織", t: "受注がキーパーソン頼みで、他のメンバーが再現できない" },
              { axis: "採用・組織", w: "採用", t: "採用基準が定まらず、面接官によって評価がぶれる" },
              { axis: "財務・管理会計", w: "資金繰り", t: "管理会計が見えておらず、意思決定が後手に回る" },
              { axis: "プロダクト戦略", w: "新規事業", t: "立ち上げたが、どこに刺さっているのか分からないまま時間が過ぎる" },
              { axis: "技術基盤", w: "AI・DX", t: "方針が定まらず、手探りのまま投資だけが続く" },
              { axis: "経営体制", w: "海外進出", t: "拡大のスピードに、組織の意思決定が追いついていない" },
            ].map((x) => (
              <div key={x.t} className="lp-issue">
                <div className="lp-issue-w">{x.w}。</div>
                <div className="lp-issue-t">{x.t}</div>
                <div className="lp-issue-axis">{x.axis}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}

// 06｜ORANGE BRAND SECTION — 説明文を置かず、ブランド広告として成立させる
function BrandSection() {
  // 決め台詞「その経験に、次の打席を。」は最終CTAで使うため、ここでは重複させない。
  const lines = [
    "経験を、\n眠らせない。",
    "その経験を、\n必要としている会社がある。",
  ];
  return (
    <section className="on-orange" data-tone="orange" style={{ paddingTop: 0, paddingBottom: 0 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            minHeight: "min(56svh, 470px)", display: "flex", alignItems: "center",
            borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <Wrap>
            <Reveal>
              <h2 className="lp-display" style={{ whiteSpace: "pre-line", color: "#fff" }}>{l}</h2>
              {i === lines.length - 1 && (
                <div style={{ marginTop: 44 }}>
                  <Wordmark size={17} color="rgba(255,255,255,0.78)" />
                </div>
              )}
            </Reveal>
          </Wrap>
        </div>
      ))}
    </section>
  );
}

// 08｜TWO SIDES — ホバーでそれぞれの領域が少し広がる
function TwoSides() {
  const sides = [
    { en: "For Companies", jp: "会社に足りない\n経験を。", cta: "経験を探す", href: "/diagnose" },
    { en: "For Professionals", jp: "あなたの経験に、\n次の打席を。", cta: "経験を登録する", href: "/join" },
  ];
  return (
    <section className="on-ink lp-two" data-tone="dark">
      {sides.map((s) => (
        <a key={s.en} href={s.href} className="lp-two-side">
          <Label tone="plain" style={{ color: C.orange, marginBottom: 26 }}>{s.en}</Label>
          <h2 className="lp-head" style={{ whiteSpace: "pre-line", color: "#fff", fontSize: "clamp(27px, 3.6vw, 52px)", lineHeight: 1.3 }}>
            {s.jp}
          </h2>
          <span
            className="lp-btn lp-btn--onInk"
            style={{ marginTop: 40, alignSelf: "flex-start", pointerEvents: "none" }}
          >
            {s.cta}<Arrow />
          </span>
        </a>
      ))}
    </section>
  );
}

// 09｜FINAL CTA — もう一度ブランドメッセージへ戻る。余計な説明は置かない
function FinalCTA() {
  return (
    <section className="on-orange lp-sec" data-tone="orange" style={{ textAlign: "center" }}>
      <Wrap>
        <Reveal>
          <h2 className="lp-display" style={{ color: "#fff", whiteSpace: "pre-line" }}>
            {"その経験に、\n次の打席を。"}
          </h2>
          <div style={{ marginTop: 34 }}>
            <Wordmark size={19} color="rgba(255,255,255,0.8)" />
          </div>
          <div style={{ marginTop: 52, display: "flex", justifyContent: "center" }}>
            <Btn href="/signup" variant="onOrange">BATTER BOXを始める</Btn>
          </div>
        </Reveal>
      </Wrap>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-sec lp-sec--tight" style={{ paddingBottom: "clamp(40px, 5vw, 64px)" }}>
      <Wrap>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <img src="/logo.png" alt="BATTER BOX" style={{ height: 38, width: "auto", display: "block" }} />
            <p className="lp-small" style={{ marginTop: 16, maxWidth: 320 }}>
              AIが経営課題を分析し、いま必要な経験を持つ人と企業をつなぐプラットフォーム。
            </p>
          </div>
          <div className="lp-footer-links">
            <a href="/diagnose">企業の方</a>
            <a href="/join">経験を活かしたい方</a>
            <a href="/company">会社概要</a>
            <a href="/legal/terms">利用規約</a>
            <a href="/legal/privacy">プライバシーポリシー</a>
            <a href="/security">セキュリティ</a>
            <a href="/contact">お問い合わせ</a>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 36, paddingTop: 20, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span className="lp-small">© 株式会社BeFree</span>
          <span className="lp-label" style={{ color: C.inkFaint }}>Experience moves business.</span>
        </div>
      </Wrap>
    </footer>
  );
}

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="lp">
      <LPStyle />
      <Header user={user} />

      <main className="lp-has-mobile-cta">
        <Hero />
        <Marquee />
        <Problem />
        <AIExperience />
        <Facts />
        <People />
        <BrandSection />
        <HowItWorks />
        <Compare />
        <AfterMatch />
        <Faq />
        <TwoSides />
        <FinalCTA />
        <Footer />
      </main>

      {/* モバイルのみ: 親指で押せる位置に常時CTAを置く */}
      <div className="lp-mobile-cta">
        <a className="lp-btn lp-btn--primary" href="/diagnose">経験を探す<Arrow size={14} /></a>
        <a className="lp-btn lp-btn--ghost" href="/join">経験を登録<Arrow size={14} /></a>
      </div>
    </div>
  );
}
