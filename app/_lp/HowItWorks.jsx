"use client";

import { useEffect, useRef, useState } from "react";
import { Label, Wrap, Reveal } from "./parts";
import { LP_COLOR as C } from "./tokens";

// 4枚のカードを横並びにするのではなく、スクロールにつれて体験が
// 01 → 02 → … と進んでいく形にする。左のレールが現在地を示す。
//
// v6.16で企業/実務経験者の2つの流れに分けた。
// 「企業側のマッチの仕組みがわからない」「マッチング後の流れの説明がない」という
// フィードバックを受けたもの。以前は企業側の、しかもマッチングまでしか書いていなかった。
const FLOWS = {
  company: {
    tab: "企業の方",
    lead: "課題から、\n経験にたどり着く。",
    steps: [
      {
        n: "01", en: "Input", t: "登録して課題を入力",
        d: "メールアドレスとパスワードを決めたら、「新規事業の売上が伸びない」のように、いま向き合っている経営課題をそのままの言葉で入力します。専門用語に言い換える必要はありません。",
        out: ["メールアドレスとパスワード(クレジットカードは不要)", "会社の基本情報(業種・従業員数・成長段階)", "いま困っていることの記述"],
      },
      {
        n: "02", en: "Analyze", t: "AIが5問を重ねる",
        d: "業種と成長段階に合わせて、AIが質問を組み立てます。回答するたびに次の質問が変わる対話形式で、5問・約3分で終わります。",
        out: ["業種ごとに変わる質問", "回答に応じた掘り下げ", "気になる項目は後から追加で深掘り可能"],
      },
      {
        n: "03", en: "Identify", t: "必要な経験を特定",
        d: "10軸のスコアで会社の状態を可視化し、成長を止めている課題TOP3と、それを解くために必要な経験を言語化します。ここまで無料です。",
        out: ["10軸のGrowth Mapと総合スコア", "課題TOP3(現状・放置した場合のリスク・優先度)", "なぜその点数なのかの根拠"],
      },
      {
        n: "04", en: "Match", t: "経験を持つ人が提案される",
        d: "課題の重みと、実務経験者のスキルマップを照らし合わせて候補を並べます。「誰が優秀か」ではなく「この課題に、その経験が合っているか」で順番が決まります。",
        out: ["候補ごとのマッチ度と、その内訳6項目", "解決できる課題領域のタグ", "なぜこの人なのかの説明文"],
      },
      {
        n: "05", en: "Talk", t: "話してみて、進めるか決める",
        d: "気になる方にメッセージを送ります(AIが挨拶文の下書きを用意します)。やり取りの中で「契約に進みたい」意思を双方が示したら、稼働時間と月額を提示して契約を提案します。",
        out: ["メッセージでのやり取り", "双方が「進みたい」を示してから次へ", "月10時間から。合わなければ契約せずに終われます"],
      },
      {
        n: "06", en: "Run", t: "一緒に進めて、完了を承認",
        d: "契約が成立するとプロジェクト画面が開きます。90日分の実行プランとKPIをAIが設計し、タスク・稼働ログ・成果物を同じ画面で共有します。完了報告を確認して承認すると契約完了です。",
        out: ["90日の実行プランとKPI", "タスク・稼働ログ・成果物の共有", "完了報告 → 企業が承認 → 契約完了"],
      },
    ],
  },
  talent: {
    tab: "経験を活かしたい方",
    lead: "その経験が、\n必要とされる場所へ。",
    steps: [
      {
        n: "01", en: "Register", t: "登録して経歴を入力",
        d: "メールアドレスとパスワードを決めたら、役職・経験年数・経験してきた領域を選びます。役職は兼任している場合すべて選べます。職務経歴の記述は任意です。",
        out: ["メールアドレスとパスワード", "役職・業種・実務経験年数", "経験してきた機能領域と、具体的な業務"],
      },
      {
        n: "02", en: "Dialogue", t: "AIと5問の対話をする",
        d: "AIアシスタント「タクト」が、申告いただいた経験に沿って質問します。答えるたびに次の質問が変わります。当てはまる選択肢がなければ「この中に当てはまるものがない」を選べます。",
        out: ["経験年数に合わせた聞き方", "5問・約3分", "職務経歴書の準備は不要"],
      },
      {
        n: "03", en: "Map", t: "スキルマップができる",
        d: "対話の内容から、10軸・合計100点であなたの経験の配分を可視化します。全員が高得点になる設計ではなく「どこに寄っているか」を示すので、特定の領域に強い方ほど出番が来ます。",
        out: ["10軸のスキルマップ(合計100点の配分)", "強みの軸と、その根拠", "気になる軸は後から深掘りして修正可能"],
      },
      {
        n: "04", en: "Match", t: "課題の合う企業と出会う",
        d: "あなたの配分と、企業が抱える課題の重みを照らし合わせます。企業からの提案を受け取るだけでなく、自分から企業の課題を見て連絡することもできます。",
        out: ["あなたの経験が活きる企業の一覧", "その企業の課題TOP3(AI診断より)", "企業からのメッセージも届きます"],
      },
      {
        n: "05", en: "Agree", t: "条件を確認して契約",
        d: "メッセージでやり取りし、双方が「進みたい」意思を示すと、企業から稼働時間と月額の提案が届きます。内容を確認して承諾するか、辞退するかを選べます。",
        out: ["稼働時間と月額を確認してから承諾", "業務委託契約。月10時間から", "本業と並行して関われます"],
      },
      {
        n: "06", en: "Work", t: "関わって、完了を報告",
        d: "プロジェクト画面でタスクと稼働ログを記録しながら進めます。作業が終わったら完了を報告し、企業の承認で契約完了。稼働枠が空き、次の打席に進めます。",
        out: ["タスク・稼働ログ・成果物の共有", "完了報告 → 企業が承認 → 契約完了", "同時に受けられる社数は自分で上限を設定"],
      },
    ],
  },
};

const ROLES = ["company", "talent"];

export default function HowItWorks() {
  const [role, setRole] = useState("company");
  const [active, setActive] = useState(0);
  const panelRefs = useRef([]);
  const flow = FLOWS[role];

  // タブを切り替えるとパネルが作り直されるので、監視もやり直す。
  useEffect(() => {
    setActive(0);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.idx));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    panelRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [role]);

  return (
    <section className="lp-sec" id="about">
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(32px, 4vw, 56px)" }}>
          <Label style={{ marginBottom: 22 }}>How it works</Label>
          <h2 className="lp-giant" style={{ whiteSpace: "pre-line" }}>{flow.lead}</h2>
          <p className="lp-sub" style={{ marginTop: 20 }}>
            登録から、マッチング、契約、完了までの流れです。見たい側を選んでください。
          </p>

          <div className="lp-how-tabs" role="tablist" aria-label="流れを見る立場">
            {ROLES.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={role === key}
                className="lp-how-tab"
                data-active={role === key}
                onClick={() => setRole(key)}
              >
                {FLOWS[key].tab}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="lp-how" key={role}>
          {/* 左: 現在地を示すレール */}
          <div className="lp-how-rail">
            {flow.steps.map((s, i) => (
              <div key={s.n} className="lp-how-step" data-active={i === active}>
                <span className="lp-num" style={{ fontSize: 13, color: i === active ? C.orange : C.inkFaint, paddingTop: 5 }}>{s.n}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.02em" }}>{s.t}</div>
                  <span className="lp-label" style={{ color: C.inkFaint, fontSize: 10 }}>{s.en}</span>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.line}` }} />
          </div>

          {/* 右: スクロールで進む本体 */}
          <div>
            {flow.steps.map((s, i) => (
              <div
                key={s.n}
                ref={(el) => (panelRefs.current[i] = el)}
                data-idx={i}
                className="lp-how-panel"
              >
                <span className="lp-num" style={{ fontSize: "clamp(48px, 6.4vw, 96px)", color: i === active ? C.orange : C.line, lineHeight: 0.9, transition: "color 420ms cubic-bezier(0.22,1,0.36,1)" }}>
                  {s.n}
                </span>
                <h3 className="lp-head" style={{ marginTop: 18 }}>{s.t}</h3>
                <p className="lp-body" style={{ marginTop: 14, maxWidth: 600 }}>{s.d}</p>
                <ul className="lp-how-out">
                  {s.out.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
