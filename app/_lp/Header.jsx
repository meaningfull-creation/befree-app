"use client";

import { useEffect, useState } from "react";
import { Arrow } from "./parts";
import { LP_COLOR as C } from "./tokens";

// スクロール前は背景と一体化し、少し下げると背景が付いて固定ヘッダーになる。
//
// さらに、ヘッダーの真下にあるセクションの地色に合わせて見た目を切り替える。
// オレンジ面・黒面の上に白い帯が乗るとブランドセクションが分断されてしまうため、
// ヘッダー自体をその地色にする(完全に透明にすると、下を流れる文字と重なって読めなくなる)。
// 地色が濃いときはロゴ画像(ネイビー×オレンジ)ではなく白のワードマークに差し替える。
export default function Header({ user }) {
  const [tone, setTone] = useState("top"); // top | light | dark | orange

  useEffect(() => {
    let raf = 0;
    const probeY = 30; // ヘッダーの中心あたり

    const update = () => {
      raf = 0;
      if (window.scrollY <= 24) { setTone("top"); return; }
      const sections = document.querySelectorAll("section[data-tone]");
      let found = "light";
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        if (r.top <= probeY && r.bottom > probeY) { found = el.dataset.tone; break; }
      }
      setTone(found);
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const onColor = tone === "dark" || tone === "orange";
  const fg = onColor ? "#fff" : C.ink;
  const ctaClass = tone === "orange" ? "lp-btn--onOrange" : onColor ? "lp-btn--onInk" : "lp-btn--primary";

  return (
    <header className="lp-header" data-stuck={tone === "light"} data-mode={tone} data-oncolor={onColor}>
      <div className="lp-wrap">
        <div className="lp-header-inner">
          <a href="/" aria-label="BATTER BOX トップページ" style={{ display: "flex", alignItems: "center" }}>
            {onColor ? (
              // 白抜き版のロゴ画像がないため、濃い地色の上では英字ワードマークで代替する
              <span className="lp-en" style={{ fontWeight: 900, fontSize: 19, letterSpacing: "-0.02em", color: "#fff" }}>
                BATTER BOX
              </span>
            ) : (
              <img className="lp-header-logo" src="/logo.png" alt="BATTER BOX" />
            )}
          </a>

          <nav className="lp-nav-desktop" style={{ marginLeft: "clamp(24px, 5vw, 72px)", display: "flex", gap: 30, alignItems: "center" }}>
            <a className="lp-navlink" href="/diagnose" style={{ color: fg }}>企業の方</a>
            <a className="lp-navlink" href="/join" style={{ color: fg }}>経験を活かしたい方</a>
            <a className="lp-navlink" href="#about" style={{ color: fg }}>BATTER BOXとは</a>
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {user ? (
              <a className={`lp-btn lp-btn--sm ${ctaClass}`} href="/app">アプリを開く<Arrow size={14} /></a>
            ) : (
              <>
                <a className="lp-navlink lp-nav-desktop" href="/login" style={{ color: fg }}>ログイン</a>
                <a className={`lp-btn lp-btn--sm ${ctaClass}`} href="/signup">無料で始める<Arrow size={14} /></a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
