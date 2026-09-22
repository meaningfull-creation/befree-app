"use client";

import { useEffect, useRef, useState } from "react";
import { LP_COLOR as C } from "./tokens";

// 矢印。ブランド要素として全CTAで統一して使う(ホバーで右へ少し動く)。
export function Arrow({ size = 16 }) {
  return (
    <svg className="lp-arrow" width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
    </svg>
  );
}

export function Btn({ href, variant = "primary", size, children, onClick, type }) {
  const cls = `lp-btn lp-btn--${variant}${size === "sm" ? " lp-btn--sm" : ""}`;
  const inner = (<>{children}<Arrow size={size === "sm" ? 14 : 16} /></>);
  if (onClick || type) return <button type={type || "button"} className={cls} onClick={onClick}>{inner}</button>;
  return <a href={href} className={cls}>{inner}</a>;
}

// スクロールで一度だけ現れる。動きは控えめにして、高級感を失わない程度にとどめる。
export function Reveal({ children, delay = 0, as: Tag = "div", className = "", style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`lp-reveal ${className}`} data-shown={shown} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

// 英字の小ラベル。巨大コピーとの落差を作るための要素。
export function Label({ children, tone = "orange", style }) {
  return <span className={`lp-label${tone === "orange" ? " lp-label--orange" : ""}`} style={style}>{children}</span>;
}

// 経験タグ。ホームベースの五角形を頭に付ける。
export function Tag({ children, tone = "ink" }) {
  const tones = {
    ink: { background: C.ink, color: "#fff" },
    orange: { background: C.orange, color: "#fff" },
    outline: { border: `1.5px solid ${C.line}`, color: C.inkSoft },
    onInk: { border: "1.5px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.88)" },
  };
  return <span className="lp-tag" style={tones[tone]}>{children}</span>;
}

// ワードマーク。白抜き版のロゴ画像がないため、オレンジ面・黒面ではこれをロゴの代わりに使う。
export function Wordmark({ size = 20, color = "#fff", style }) {
  return (
    <span className="lp-en" style={{ fontWeight: 900, fontSize: size, letterSpacing: "-0.02em", color, lineHeight: 1, ...style }}>
      BATTER BOX
    </span>
  );
}

export function Wrap({ children, narrow, className = "", style }) {
  return <div className={`lp-wrap${narrow ? " lp-wrap--narrow" : ""} ${className}`} style={style}>{children}</div>;
}

