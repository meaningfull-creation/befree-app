"use client";

import { Btn, Label, Reveal, Wrap } from "./parts";
import { LP_COLOR as C } from "./tokens";

// v6.0で削除してしまった実質的なコンテンツを、新しいデザイン言語で作り直したもの。
// 「余白の中に入れる中身」がないままだったのが未完成感の主因だった。

// ---------------------------------------------------------------------------
// 正社員採用との比較。カードを2枚並べるのではなく、行で対比させる。
// ---------------------------------------------------------------------------
const COMPARE = [
  { k: "費用", a: "月60〜100万円ほどの人件費", b: "月10時間分から。必要な分だけ" },
  { k: "稼働", a: "週40時間の稼働が前提", b: "月10時間から、必要なときに" },
  { k: "契約", a: "長期の雇用契約", b: "業務委託。3ヶ月単位でも" },
  { k: "期間", a: "採用まで2〜6ヶ月程度", b: "診断したその日から提案" },
  { k: "範囲", a: "職種単位での採用", b: "解決したい課題の単位で" },
  { k: "リスク", a: "ミスマッチ時の影響が大きい", b: "合わなければ契約せずに終われる" },
];

export function Compare() {
  return (
    <section className="lp-sec" data-tone="light">
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(32px, 4vw, 56px)" }}>
          <Label style={{ marginBottom: 20 }}>Vs. Full-time hire</Label>
          <h2 className="lp-giant">正社員採用と、<br />何が違うのか。</h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="lp-cmp">
            <div className="lp-cmp-row lp-cmp-head">
              <span />
              <span className="lp-cmp-a">正社員を採用する場合</span>
              <span className="lp-cmp-b">BATTER BOXの場合</span>
            </div>
            {COMPARE.map((r) => (
              <div key={r.k} className="lp-cmp-row">
                <span className="lp-cmp-k">{r.k}</span>
                <span className="lp-cmp-a">{r.a}</span>
                <span className="lp-cmp-b">{r.b}</span>
              </div>
            ))}
          </div>
          <p className="lp-small" style={{ marginTop: 18 }}>
            ※ 金額・期間は一般的な目安の一例です。実際の条件は個別の契約により異なります。
          </p>
        </Reveal>
      </Wrap>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 契約後に何が起きるか。「マッチングして終わりではない」ことを具体で示す。
// ---------------------------------------------------------------------------
const AFTER = [
  { n: "90", u: "日", t: "実行プランを自動生成", d: "課題が特定できたら、契約した稼働時間に収まる3ヶ月分の実行プランと、進捗を測るKPIをAIが設計します。" },
  { n: "1", u: "画面", t: "タスク・KPI・稼働ログを共有", d: "企業と実務経験者が同じプロジェクト画面を見ながら進めます。成果物のファイルもここに集まります。" },
  { n: "毎", u: "月", t: "AIが進捗をレビュー", d: "溜まったタスク・KPI・稼働ログから、その月に何が進んで何が残ったかをAIがまとめます。" },
  { n: "90", u: "日ごと", t: "再診断でスコアの変化を見る", d: "同じ10軸で測り直し、着手前と比べてどの軸が動いたかをBefore/Afterで確認できます。" },
];

export function AfterMatch() {
  return (
    <section className="lp-sec" data-tone="light" style={{ background: C.paper, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(32px, 4vw, 56px)" }}>
          <Label style={{ marginBottom: 20 }}>After matching</Label>
          <h2 className="lp-giant">マッチングして、<br />終わりではありません。</h2>
          <p className="lp-sub" style={{ marginTop: 20 }}>
            伴走が始まってからも、進捗と成果をAIが並走して可視化します。
          </p>
        </Reveal>

        <div className="lp-after">
          {AFTER.map((f, i) => (
            <Reveal key={f.t} delay={i * 70} className="lp-after-item">
              <div className="lp-after-n">
                <span className="lp-num">{f.n}</span><span className="lp-after-u">{f.u}</span>
              </div>
              <div>
                <div className="lp-after-t">{f.t}</div>
                <p className="lp-body" style={{ marginTop: 8 }}>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ。<details>/<summary>で実装し、JSなしで開閉できるようにする。
// ---------------------------------------------------------------------------
const FAQ = [
  { q: "診断だけ受けて、利用しなくても大丈夫ですか?", a: "はい。AI課題診断とGrowth Mapの作成まではすべて無料で、そこで終えていただいて構いません。提案された人材と話すかどうかは、診断結果を見てから判断できます。クレジットカードの登録も不要です。" },
  { q: "料金はどのくらいかかりますか?", a: "月10時間からの業務委託が基本単位です。稼働時間・期間は案件ごとの個別見積もりになります。企業はBATTER BOXに業務委託料をお支払いいただき、BATTER BOXから実務経験者へお支払いする2段階の契約構造です(β版のため、金額の目安は今後公開予定です)。" },
  { q: "なぜ採用ではなく業務委託なのですか?", a: "正社員採用には、採用コスト・給与・社会保険・採用にかかる期間・ミスマッチのリスクが伴います。BATTER BOXは「いま必要な経験だけ」を、月10時間という小さな単位から始められる業務委託の形にしています。正社員採用の前段階としてもお使いいただけます。" },
  { q: "どんな人が登録しているのですか?", a: "事業責任者・CFO・CMO・人事責任者など、特定の領域で実務の意思決定を担ってきた方です。登録時にAIがスキルマップを生成し、10軸のスコアと87の経験領域から強みを構造化します。" },
  { q: "AIの診断結果はどのくらい正確ですか?", a: "対話の内容と、業種・成長段階・組織規模をもとにスコアリングしています。対話で直接触れた領域は具体的な根拠を、触れていない領域は「推定である」旨を明記して表示します。気になる項目は、結果画面から数問のやり取りで深掘りして精度を上げられます。" },
  { q: "支援が始まった後の進捗はどう管理しますか?", a: "プロジェクト画面でタスク・KPI・稼働ログ・成果物を企業と実務経験者が共有します。作業が完了したら人材が完了を報告し、企業が内容を確認して承認すると契約完了となる流れです。" },
];

export function Faq() {
  return (
    <section className="lp-sec" data-tone="light">
      <Wrap>
        <div className="lp-faq-grid">
          <Reveal>
            <Label style={{ marginBottom: 20 }}>FAQ</Label>
            <h2 className="lp-giant">よくある質問</h2>
            <p className="lp-body" style={{ marginTop: 20, maxWidth: 320 }}>
              ここにない疑問は、お問い合わせからお気軽にどうぞ。
            </p>
            <div style={{ marginTop: 26 }}>
              <Btn href="/contact" variant="ghost">お問い合わせ</Btn>
            </div>
          </Reveal>

          <Reveal delay={80} className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  <span>{f.q}</span>
                  <i aria-hidden="true" />
                </summary>
                <p className="lp-body">{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </Wrap>
    </section>
  );
}
