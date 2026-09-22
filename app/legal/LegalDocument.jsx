import { COLORS, FONT_DISPLAY, GlobalStyle } from "@/lib/theme";

// 利用規約・プライバシーポリシー共通のレイアウト。
// 条文が長いため、冒頭に目次を置き、各条へアンカーで飛べるようにしている。
export default function LegalDocument({ title, version, enactedOn, revisedOn, sections, note }) {
  return (
    <div className="app-root">
      <GlobalStyle />
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <a href="/"><img className="app-topbar-logo" src="/logo.png" alt="BATTER BOX" /></a>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a className="btn-ghost" href="/legal/terms" style={{ fontSize: 12.5, padding: "7px 14px" }}>利用規約</a>
            <a className="btn-ghost" href="/legal/privacy" style={{ fontSize: 12.5, padding: "7px 14px" }}>プライバシーポリシー</a>
          </div>
        </div>
      </header>

      <div style={{ position: "relative", maxWidth: 760, margin: "0 auto", padding: "40px 24px 100px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, margin: "0 0 10px" }}>{title}</h1>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: COLORS.muted, fontSize: 12.5, marginBottom: 28 }}>
          <span>制定日: {enactedOn}</span>
          {revisedOn && <span>最終改定日: {revisedOn}</span>}
          <span>バージョン: {version}</span>
        </div>

        {note && (
          <div style={{ background: COLORS.surfaceRaised, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8, marginBottom: 28 }}>
            {note}
          </div>
        )}

        <nav aria-label="目次" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 22px", marginBottom: 36 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>目次</div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "6px 20px" }}>
            {sections.map((s, i) => (
              <li key={s.title}>
                <a href={`#sec-${i + 1}`} style={{ fontSize: 12.5, color: COLORS.muted, textDecoration: "none", lineHeight: 1.7 }}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.title} id={`sec-${i + 1}`} style={{ marginBottom: 32, scrollMarginTop: 90 }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, margin: "0 0 10px", paddingBottom: 8, borderBottom: `1px solid ${COLORS.border}` }}>
              {s.title}
            </h2>
            {s.body.map((p, j) => (
              <p
                key={j}
                style={{
                  fontSize: 13.5,
                  lineHeight: 2,
                  color: COLORS.text,
                  margin: j === s.body.length - 1 ? 0 : "0 0 12px",
                  // 号立て((1)(ア)等)の段落は字下げして読みやすくする
                  paddingLeft: /^[(（]/.test(p) ? 16 : 0,
                }}
              >
                {p}
              </p>
            ))}
          </section>
        ))}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 24, marginTop: 40, display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
          <a href="/" style={{ color: COLORS.teal }}>トップページ</a>
          <a href="/company" style={{ color: COLORS.teal }}>会社概要</a>
          <a href="/contact" style={{ color: COLORS.teal }}>お問い合わせ</a>
          <span style={{ marginLeft: "auto", color: COLORS.faint }}>株式会社BeFree</span>
        </div>
      </div>
    </div>
  );
}
