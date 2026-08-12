import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BATTER BOX — AI課題診断×実行伴走人材プラットフォーム";
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
            "linear-gradient(120deg, #F7F9FC 0%, #EEF2F7 55%, #F7F9FC 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#04162D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F46919",
              fontSize: 30,
              fontWeight: 800,
              marginRight: 18,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#04162D", letterSpacing: 1 }}>BATTER BOX</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#04162D", lineHeight: 1.35, display: "flex", flexDirection: "column" }}>
          <span>課題をAIで診断し、</span>
          <span>実務経験者が現場に入り込んで伴走する。</span>
        </div>
        <div style={{ fontSize: 26, color: "#5B6B82", marginTop: 30, display: "flex" }}>
          AI課題診断 × 実行伴走人材プラットフォーム
        </div>
      </div>
    ),
    { ...size }
  );
}
