"use client";

import { Btn, Label, Reveal, Wrap } from "./parts";
import { LP_COLOR as C } from "./tokens";
import { scheduleLabels } from "@/lib/paymentSchedule";

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
// 料金と、お金が動くタイミング。
//
// v6.17で追加。「企業側がいつお金のやり取りが発生するのかが不明。打ち合わせで
// ほぼ確実に突っ込まれる」というご指摘を受けたもの。それまでLPで費用に触れていたのは
// FAQの1問だけで、締め日や支払期日といった実際のタイミングは書いていなかった。
//
// 日付の表現は lib/paymentSchedule.js から取る。請求・支払い画面と同じ定義なので、
// 片方だけ直して食い違う、ということが起きない。
// ---------------------------------------------------------------------------
const PAY_STEPS = [
  {
    n: "01", t: "AI課題診断", cost: "無料",
    d: "Growth Mapと課題TOP3が出るところまで、費用はかかりません。クレジットカードの登録も不要です。",
  },
  {
    n: "02", t: "候補の提案・メッセージ", cost: "無料",
    d: "何人と話しても費用は発生しません。合う人がいなければ、ここで終えていただいて構いません。",
  },
  {
    n: "03", t: "契約が成立", cost: "ここから発生",
    d: "稼働時間と月額を提示し、相手が承諾した時点で契約成立です。金額は合意した内容がそのまま適用されます。",
    highlight: true,
  },
  {
    n: "04", t: "毎月のお支払い", cost: "月額のみ",
    d: "稼働した月の分を、締め日の翌月末までにBATTER BOXへお支払いいただきます。初期費用・成約手数料はありません。",
  },
];

export function Pricing() {
  const sched = scheduleLabels();
  return (
    <section className="lp-sec" data-tone="light">
      <Wrap>
        <Reveal style={{ marginBottom: "clamp(32px, 4vw, 56px)" }}>
          <Label style={{ marginBottom: 20 }}>Pricing</Label>
          <h2 className="lp-giant">お金が動くのは、<br />契約が成立してからです。</h2>
          <p className="lp-sub" style={{ marginTop: 20 }}>
            診断しても、候補と話しても、費用はかかりません。
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="lp-pay">
            {PAY_STEPS.map((p) => (
              <div key={p.n} className="lp-pay-step" data-highlight={!!p.highlight}>
                <div className="lp-pay-head">
                  <span className="lp-num lp-pay-n">{p.n}</span>
                  <span className="lp-pay-cost">{p.cost}</span>
                </div>
                <div className="lp-pay-t">{p.t}</div>
                <p className="lp-body" style={{ marginTop: 8, fontSize: 13 }}>{p.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140} className="lp-pay-detail">
          <div>
            <h3 className="lp-pay-sub">お金の流れ</h3>
            <p className="lp-body" style={{ marginTop: 12 }}>
              企業は<b>BATTER BOX</b>に業務委託料をお支払いいただき、BATTER BOXから実務経験者へお支払いする2段階の構造です。
              実務経験者と直接金銭のやり取りをしていただく必要はありません。
              BATTER BOXの取り分は、企業のお支払い額と実務経験者への支払額の差額です。
            </p>
            <div className="lp-pay-chain" aria-label="企業からBATTER BOXへ、BATTER BOXから実務経験者へ支払われます">
              <span>企業</span><i aria-hidden="true" /><span className="lp-pay-mid">BATTER BOX</span><i aria-hidden="true" /><span>実務経験者</span>
            </div>
          </div>

          <div>
            <h3 className="lp-pay-sub">支払いのタイミング</h3>
            <dl className="lp-pay-dates">
              <dt>稼働の締め</dt><dd>{sched.closing}</dd>
              <dt>企業のお支払い期日</dt><dd>{sched.companyDue}</dd>
              <dt>実務経験者への入金</dt><dd>{sched.talentPayout}</dd>
            </dl>
            <p className="lp-small" style={{ marginTop: 14 }}>
              {sched.note}企業からのご入金を確認したうえで実務経験者へお支払いするため、入金日は企業の支払期日より後に置いています。
            </p>
          </div>
        </Reveal>

        <p className="lp-small" style={{ marginTop: 20 }}>
          ※ 稼働時間・月額は案件ごとの個別見積もりです(β版のため、金額の目安は今後公開予定です)。契約種別は業務委託(準委任)です。
        </p>
      </Wrap>
    </section>
  );
}

// ---------------------------------------------------------------------------
// マッチングしてから契約完了までの、企業と実務経験者それぞれの動き。
//
// v6.16で追加。「マッチング後の企業側と人材側の流れがわかる説明はないのか」という
// フィードバックを受けたもの。それまでは下のAFTER(=支援中に何が起きるか)しか
// 書いておらず、提案から契約成立までに誰が何をするのかが抜けていた。
// ---------------------------------------------------------------------------
const HANDOFF = [
  {
    n: "01", t: "提案が届く",
    company: "課題に合う実務経験者が、マッチ度とその内訳つきで並びます。",
    talent: "自分の経験が活きる企業が届きます。自分から探して連絡することもできます。",
  },
  {
    n: "02", t: "メッセージでやり取り",
    company: "気になる方に声をかけます。AIが挨拶文の下書きを用意します。",
    talent: "届いたメッセージに返信します。企業の課題TOP3を見てから判断できます。",
  },
  {
    n: "03", t: "進むかどうかを決める",
    company: "話して合いそうなら「契約に進みたい」と意思表示します。",
    talent: "同じように意思表示します。双方が示してはじめて次に進みます。",
  },
  {
    n: "04", t: "条件の提示と承諾",
    company: "稼働時間と月額を決めて、契約を提案します。",
    talent: "内容を確認して、承諾するか辞退するかを選びます。",
  },
  {
    n: "05", t: "プロジェクト開始",
    company: "90日分の実行プランとKPIをAIが設計。同じ画面で進捗を見ます。",
    talent: "タスクと稼働ログを記録しながら進めます。成果物もここに集めます。",
  },
  {
    n: "06", t: "完了と承認",
    company: "報告された内容を確認し、承認すると契約完了です。",
    talent: "作業が終わったら完了を報告します。承認されると稼働枠が空きます。",
  },
];

// ---------------------------------------------------------------------------
// 支援が始まってから何が起きるか。
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
            提案が届いてから契約完了まで、企業と実務経験者がそれぞれ何をするのかを並べました。
          </p>
        </Reveal>

        <Reveal delay={60} style={{ marginBottom: "clamp(44px, 5vw, 76px)" }}>
          <div className="lp-hand">
            <div className="lp-hand-row lp-hand-head">
              <span />
              <span className="lp-hand-a">企業の方</span>
              <span className="lp-hand-b">経験を活かしたい方</span>
            </div>
            {HANDOFF.map((r) => (
              <div key={r.n} className="lp-hand-row">
                <span className="lp-hand-k">
                  <span className="lp-num lp-hand-n">{r.n}</span>
                  <span className="lp-hand-t">{r.t}</span>
                </span>
                <span className="lp-hand-a">{r.company}</span>
                <span className="lp-hand-b">{r.talent}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal style={{ marginBottom: "clamp(24px, 3vw, 36px)" }}>
          <h3 className="lp-head">支援が始まってからも、<br />AIが並走します。</h3>
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
  { q: "診断だけ受けて、利用しなくても大丈夫ですか?", a: "はい。AI課題診断とGrowth Mapの作成まではすべて無料で、そこで終えていただいて構いません。提案された人材と話すかどうかは、診断結果を見てから判断できます。ご利用の最初にメールアドレスとパスワードの登録をお願いしていますが(診断結果を保存し、あとから見返せるようにするためです)、クレジットカードの登録は不要です。" },
  { q: "料金はどのくらいかかりますか?", a: "月10時間からの業務委託が基本単位です。稼働時間・期間は案件ごとの個別見積もりになります。企業はBATTER BOXに業務委託料をお支払いいただき、BATTER BOXから実務経験者へお支払いする2段階の契約構造です(β版のため、金額の目安は今後公開予定です)。" },
  { q: "いつ、お金のやり取りが発生しますか?", a: "契約が成立してからです。AI課題診断・Growth Mapの作成・候補の提案・メッセージのやり取りまでは、何人と話しても費用はかかりません。稼働時間と月額を提示し、相手が承諾した時点で契約成立となり、そこから月額の費用が発生します。初期費用や成約手数料はいただいていません。支払いは稼働した月の末日で締め、締め日の翌月末日までにBATTER BOXへお支払いいただきます(実務経験者への入金は、企業からのご入金を確認したうえで締め日の翌々月15日です)。" },
  { q: "途中で解約できますか? 合わなかった場合はどうなりますか?", a: "契約前であれば、メッセージのやり取りの途中でいつでも終えていただけます。費用は発生しません。契約後の期間・解約条件は個別の契約で定めますが、月10時間・3ヶ月単位といった小さな単位から始められる設計にしているのは、合わなかったときの影響を小さくするためです。" },
  { q: "なぜ採用ではなく業務委託なのですか?", a: "正社員採用には、採用コスト・給与・社会保険・採用にかかる期間・ミスマッチのリスクが伴います。BATTER BOXは「いま必要な経験だけ」を、月10時間という小さな単位から始められる業務委託の形にしています。正社員採用の前段階としてもお使いいただけます。" },
  { q: "どんな人が登録しているのですか?", a: "事業責任者・CFO・CMO・人事責任者など、特定の領域で実務の意思決定を担ってきた方です。登録時にAIがスキルマップを生成し、10軸のスコアと87の経験領域から強みを構造化します。" },
  { q: "マッチ度は、どうやって決まっているのですか?", a: "「誰が優秀か」ではなく「この課題に、その経験が合っているか」で決まります。企業側は診断結果から10軸の課題を合計100点で配分し、実務経験者側も経験の偏りを合計100点で配分します。そのうえで、企業の課題TOP3の軸について、必要な経験がどれだけ揃っているかを計算します。両方とも合計100点なので、誰であってもすべての企業に対して高いマッチ度にはなりません。特定の領域で経験を積んできた方ほど、その課題を抱える企業から上位に出ます。マッチ度は内訳6項目まで企業側に表示されます。" },
  { q: "実務経験者は、どうやって企業と出会うのですか?", a: "どちらからでも始められます。企業の候補一覧にあなたが表示されてメッセージが届く場合と、あなたがご自身の画面で「経験が活きる企業」の一覧を見て、課題TOP3を確認してから連絡する場合があります。いずれの場合も、メッセージのやり取りを経て、双方が「契約に進みたい」意思を示してはじめて条件の提示に進みます。合わなければ、契約せずに終われます。" },
  { q: "複数の職種を兼任しています。登録はどうすればよいですか?", a: "役職・ポジションは複数選べます。兼任しているものはすべて選んでください。選択肢にない役職は自由記述で追加できます。現役の方も対象なので、選択肢は「元〇〇」ではなく現在形で書いています(本業と並行して、月10時間から関われます)。" },
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
