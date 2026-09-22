"use client";

import { AXES } from "@/lib/axes";
import { LP_COLOR as C } from "./tokens";

// Heroの右側。意味の伝わらない打席のイラストをやめ、
// 「実際に診断すると何が出てくるのか」をそのまま見せる。
// 5秒でサービスが理解できることを優先した、プロダクトの実出力のプレビュー。
const SCORES = { product: 68, sales: 34, marketing: 48, hr: 29, finance_raise: 58, finance_mgmt: 24, cs: 52, ops: 42, tech: 64, leadership: 55 };
const TARGET = { product: 82, sales: 78, marketing: 80, hr: 80, finance_raise: 82, finance_mgmt: 78, cs: 80, ops: 80, tech: 85, leadership: 82 };

// スコアが低い=深刻。低い順に3件が「成長を止めている課題」。
const TOP_ISSUES = AXES.map((a) => ({ ...a, score: SCORES[a.key] }))
  .sort((a, b) => a.score - b.score)
  .slice(0, 3);

const OVERALL = Math.round(AXES.reduce((s, a) => s + SCORES[a.key], 0) / AXES.length);

// レーダーの周囲に置くラベル。長い軸名をそのまま出すと「プロダクト…」のように
// 省略されて未完成に見えるため、この図版用の短縮名を持つ。
const SHORT = {
  product: "プロダクト", sales: "セールス", marketing: "マーケ", hr: "採用・組織",
  finance_raise: "資金調達", finance_mgmt: "財務会計", cs: "CS", ops: "オペレーション",
  tech: "技術基盤", leadership: "経営体制",
};

export default function GrowthMap() {
  const cx = 182, cy = 148, R = 98, n = AXES.length;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (scores) => AXES.map((a, i) => pt(i, (R * scores[a.key]) / 100).join(",")).join(" ");
  const ring = (f) => AXES.map((_, i) => pt(i, R * f).join(",")).join(" ");

  return (
    <div className="lp-gm">
      <div className="lp-gm-head">
        <span className="lp-label" style={{ color: C.inkFaint, fontSize: 10 }}>Batter Box Growth Map</span>
        <span className="lp-gm-badge">診断結果の例</span>
      </div>

      <div className="lp-gm-score">
        <span className="lp-num lp-gm-score-v">{OVERALL}</span>
        <span className="lp-gm-score-u">/ 100</span>
        <span className="lp-gm-score-l">企業成長スコア</span>
      </div>

      <svg viewBox="0 0 364 300" className="lp-gm-svg" role="img" aria-label="10軸の診断結果の例。現状と目標とする状態を重ねて表示しています。">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke={C.line} strokeWidth="1" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.line} strokeWidth="1" />;
        })}
        <polygon points={poly(TARGET)} fill="none" stroke={C.inkFaint} strokeWidth="1.2" strokeDasharray="4 4" />
        <polygon points={poly(SCORES)} fill={C.orange} fillOpacity="0.2" stroke={C.orange} strokeWidth="2" />
        {AXES.map((a, i) => {
          const [x, y] = pt(i, R + 21);
          // 左右の端にあるラベルは、図にかぶらないよう外側へ寄せる
          const anchor = Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
          const dx = anchor === "middle" ? 0 : x > cx ? 2 : -2;
          return (
            <text key={a.key} x={x + dx} y={y + 3} textAnchor={anchor} fontSize="9.5" fill={C.inkSoft} fontWeight="600">
              {SHORT[a.key] || a.label}
            </text>
          );
        })}
      </svg>

      <div className="lp-gm-legend">
        <span><i style={{ background: C.orange }} />現状</span>
        <span><i style={{ background: "transparent", borderTop: `2px dashed ${C.inkFaint}`, height: 0 }} />目標</span>
      </div>

      <div className="lp-gm-issues">
        <div className="lp-label" style={{ color: C.inkFaint, fontSize: 10, marginBottom: 10 }}>成長を止めている課題</div>
        {TOP_ISSUES.map((a, i) => (
          <div key={a.key} className="lp-gm-issue">
            <span className="lp-num" style={{ fontSize: 11, color: C.orange, width: 20 }}>0{i + 1}</span>
            <span className="lp-gm-issue-l">{a.label}</span>
            <span className="lp-gm-bar"><i style={{ width: `${a.score}%` }} /></span>
            <span className="lp-num lp-gm-issue-s">{a.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
