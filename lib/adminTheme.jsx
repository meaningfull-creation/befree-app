// 管理画面(社内利用)共通のデザイントークン。
// ユーザー向け画面(app/page.jsx)と同じカラーパレットを流用しつつ、
// 情報密度の高いテーブル表示に合わせて簡素にしている。

export const COLORS = {
  bg: "#0B1220",
  surface: "#131B2E",
  surfaceRaised: "#1A2338",
  border: "#26304A",
  text: "#EDEFF5",
  muted: "#8B93A7",
  faint: "#5B6584",
  teal: "#4FD1C5",
  tealDim: "#2C6E68",
  amber: "#F2B84B",
};
export const FONT_DISPLAY = "'Space Grotesk', sans-serif";
export const FONT_BODY = "'Inter', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

export function AdminGlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; background: ${COLORS.bg}; color: ${COLORS.text}; font-family: ${FONT_BODY}; }
      a { color: ${COLORS.teal}; text-decoration: none; }
      a:hover { text-decoration: underline; }
      table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
      th { text-align: left; font-family: ${FONT_MONO}; font-size: 11px; color: ${COLORS.muted}; letter-spacing: 0.04em; padding: 8px 12px; border-bottom: 1px solid ${COLORS.border}; }
      td { padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; vertical-align: top; }
      tr:hover td { background: rgba(79,209,197,0.04); }
      .admin-card { background: ${COLORS.surface}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
      .admin-badge { font-family: ${FONT_MONO}; font-size: 11px; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 2px 8px; color: ${COLORS.muted}; display: inline-block; }
      .admin-stat-value { font-family: ${FONT_MONO}; font-size: 28px; color: ${COLORS.teal}; }
      .admin-btn { font-family: ${FONT_BODY}; font-size: 12.5px; background: transparent; color: ${COLORS.teal}; border: 1px solid ${COLORS.tealDim}; border-radius: 6px; padding: 5px 11px; cursor: pointer; }
      .admin-btn:hover { background: rgba(79,209,197,0.08); }
      .admin-btn-muted { font-family: ${FONT_BODY}; font-size: 12.5px; background: transparent; color: ${COLORS.muted}; border: 1px solid ${COLORS.border}; border-radius: 6px; padding: 5px 11px; cursor: pointer; }
      .admin-btn-muted:hover { border-color: ${COLORS.muted}; }
      .admin-input { font-family: ${FONT_BODY}; font-size: 12.5px; background: ${COLORS.surfaceRaised}; border: 1px solid ${COLORS.border}; color: ${COLORS.text}; border-radius: 6px; padding: 5px 8px; width: 80px; }
    `}</style>
  );
}

export function AdminNav({ current }) {
  const items = [
    { href: "/admin", label: "ダッシュボード", key: "dashboard" },
    { href: "/admin/companies", label: "企業", key: "companies" },
    { href: "/admin/talents", label: "人材", key: "talents" },
    { href: "/admin/matches", label: "マッチング", key: "matches" },
    { href: "/admin/engagements", label: "契約", key: "engagements" },
    { href: "/admin/inquiries", label: "問い合わせ", key: "inquiries" },
    { href: "/admin/insights", label: "インサイト", key: "insights" },
    { href: "/admin/audit-log", label: "監査ログ", key: "audit-log" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 32, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16 }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, marginRight: 20 }}>BEFREE ADMIN</span>
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13.5,
            padding: "6px 12px",
            borderRadius: 6,
            color: current === it.key ? COLORS.text : COLORS.muted,
            background: current === it.key ? COLORS.surfaceRaised : "transparent",
            textDecoration: "none",
          }}
        >
          {it.label}
        </a>
      ))}
    </div>
  );
}

export function AdminShell({ current, children }) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
      <AdminGlobalStyle />
      <AdminNav current={current} />
      {children}
    </div>
  );
}
