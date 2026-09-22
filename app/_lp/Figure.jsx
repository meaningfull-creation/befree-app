"use client";

import { useState } from "react";
import { LP_COLOR as C, PEOPLE_PHOTOS_READY } from "./tokens";

// 人物のビジュアル。
//
// 現時点では人物写真の素材がないため、ブランド造形(ニアブラック/オレンジの面と
// ホームベースの五角形)で代替する。単なるプレースホルダーではなく、それ自体が
// アートディレクションとして成立する造形にしている。
//
// public/people/01.jpg 〜 を置くと、自動的に写真表示へ切り替わる。
// フリー素材感のある写真(スーツで腕組み等)は使わないこと。仕事をしている・
// 話している・考えている・笑っている、といった自然体のカットを想定している。
export default function Figure({ index, headline, onInk, ratio }) {
  // 写真を配置するまでは読みに行かない(404を出さない)。配置後は画像の失敗時のみ造形へ戻す。
  const [hasPhoto, setHasPhoto] = useState(PEOPLE_PHOTOS_READY);
  const src = `/people/${String(index).padStart(2, "0")}.jpg`;

  // 造形のバリエーション。並べたときに単調にならないよう、番号で振り分ける。
  const variant = index % 3;
  const base = onInk ? "#1E1E22" : C.ink;
  const bg = variant === 1 ? C.orange : base;
  const plateColor = variant === 1 ? base : C.orange;

  return (
    <div className="lp-figure" style={{ background: bg, aspectRatio: ratio || "3 / 4" }}>
      {hasPhoto && (
        <img
          src={src}
          alt=""
          onError={() => setHasPhoto(false)}
          style={{ position: "absolute", inset: 0 }}
        />
      )}
      {!hasPhoto && (
        <div className="lp-figure-fallback" aria-hidden="true">
          <span
            className="lp-figure-plate"
            style={{
              background: plateColor,
              transform: variant === 2 ? "rotate(180deg)" : "none",
              right: variant === 2 ? "auto" : "-14%",
              left: variant === 2 ? "-12%" : "auto",
              top: variant === 2 ? "auto" : "-8%",
              bottom: variant === 2 ? "-10%" : "auto",
            }}
          />
          {headline && (
            <span
              style={{
                position: "relative", zIndex: 1,
                fontWeight: 900, fontSize: "clamp(20px, 2.4vw, 30px)", lineHeight: 1.18,
                letterSpacing: "-0.03em", color: "#fff", textWrap: "balance",
              }}
            >
              {headline}
            </span>
          )}
          <span
            className="lp-en"
            style={{ position: "absolute", top: 18, left: 20, fontSize: 10.5, letterSpacing: "0.18em", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}
          >
            {String(index).padStart(2, "0")}
          </span>
        </div>
      )}
    </div>
  );
}
