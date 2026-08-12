import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BeFree — AI課題診断×実行伴走人材プラットフォーム";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 90px",
          background:
            "linear-gradient(120deg, #FBF5F1 0%, #F6EBE5 55%, #FBF5F1 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #C7616B, #A44E56)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: 30,
              fontWeight: 800,
              marginRight: 18,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#3A2C27", letterSpacing: 1 }}>BEFREE</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#3A2C27", lineHeight: 1.35, display: "flex", flexDirection: "column" }}>
          <span>課題をAIで診断し、</span>
          <span>実務経験者が現場に入り込んで伴走する。</span>
        </div>
        <div style={{ fontSize: 26, color: "#8C7A72", marginTop: 30, display: "flex" }}>
          AI課題診断 × 実行伴走人材プラットフォーム
        </div>
      </div>
    ),
    { ...size }
  );
}
