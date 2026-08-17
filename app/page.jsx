import { ArrowRight, Building2, Users, MessageSquare, TrendingUp, Sparkles, Target, Handshake } from "lucide-react";
import { AXES } from "@/lib/axes";
import { COLORS, FONT_DISPLAY, FONT_BODY, FONT_MONO, GlobalStyle } from "@/lib/theme";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "BATTER BOX — 会社に足りない経験を、必要な分だけ。",
  description: "事業フェーズ・組織状況をAIで診断し、会社の成長を止めている課題と今必要な経験を可視化。その経験を持つ実務経験者が月10時間からチームに参加します。",
};

// ログイン状態に応じてナビの内容を出し分ける(未ログイン/企業/実務経験者/運営者)。
// クライアント側フェッチではなくサーバー側でセッションを見るため、表示のちらつきが起きない。
async function Nav() {
  const user = await getCurrentUser();

  return (
    <header style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 1040, margin: "0 auto", padding: "24px 24px 0" }}>
      <img src="/logo.png" alt="BATTER BOX" style={{ height: 26, width: "auto" }} />
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {!user && (
          <>
            <a className="btn-ghost" href="/contact">お問い合わせ</a>
            <a className="btn-ghost" href="/login">ログイン</a>
            <a className="btn-primary" href="/signup">無料で始める</a>
          </>
        )}
        {user && user.role === "admin" && (
          <a className="btn-primary" href="/admin">管理画面へ</a>
        )}
        {user && (user.role === "company" || user.role === "talent") && (
          <>
            <span style={{ fontSize: 12.5, color: COLORS.muted, alignSelf: "center" }}>
              {user.role === "company" ? user.companyName : user.talentName}さん、おかえりなさい
            </span>
            <a className="btn-primary" href="/app">ダッシュボードへ</a>
          </>
        )}
      </div>
    </header>
  );
}

// ヒーロー用の静的ミニレーダーチャート。実際の診断結果画面(StepSkillMap)と同じ見た目に、
// 「現状」と「理想の状態」を重ねて見せる比較表示を加えたプレビュー。
// (企業スキルマップ側でも同じ考え方を使える — 診断結果と目標プロファイルの比較)
function HeroRadarPreview() {
  const current = { product: 68, sales: 34, marketing: 48, hr: 29, finance_raise: 58, finance_mgmt: 24, cs: 52, ops: 42, tech: 64, leadership: 55 };
  const ideal = { product: 82, sales: 78, marketing: 80, hr: 80, finance_raise: 82, finance_mgmt: 78, cs: 80, ops: 80, tech: 85, leadership: 82 };
  const cx = 140, cy = 138, R = 92;
  const n = AXES.length;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const toPoints = (scores) => AXES.map((a, i) => pt(i, (R * scores[a.key]) / 100).join(",")).join(" ");
  const ringPts = (f) => AXES.map((_, i) => pt(i, R * f).join(",")).join(" ");

  // 優先度の高いボトルネック(最もスコアが低い軸)をスコア円で強調
  const worst = AXES.map((a) => ({ ...a, score: current[a.key] })).sort((a, b) => a.score - b.score)[0];
  const gaugeR = 26;
  const circumference = 2 * Math.PI * gaugeR;
  const gaugeOffset = circumference * (1 - worst.score / 100);

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: "18px 16px 16px", boxShadow: "0 16px 32px rgba(164,78,86,0.14)" }}>
      <div style={{ fontSize: 10.5, color: COLORS.faint, fontFamily: FONT_MONO, marginBottom: 8 }}>BATTER BOX GROWTH MAP</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <svg viewBox="0 0 64 64" width="52" height="52" role="img" aria-label={`最優先の課題「${worst.label}」のスコア`}>
          <circle cx="32" cy="32" r={gaugeR} fill="none" stroke={COLORS.border} strokeWidth="6" />
          <circle
            cx="32" cy="32" r={gaugeR} fill="none" stroke={COLORS.amber} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={gaugeOffset} transform="rotate(-90 32 32)"
          />
          <text x="32" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill={COLORS.text} fontFamily={FONT_MONO}>{worst.score}</text>
        </svg>
        <div>
          <div style={{ fontSize: 11, color: COLORS.muted }}>最優先の課題</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14 }}>{worst.label}</div>
        </div>
      </div>

      <svg viewBox="0 0 280 265" width="100%" height="auto" role="img" aria-label="10軸スキルマップで現状と理想の状態を比較したイメージ">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ringPts(f)} fill="none" stroke={COLORS.border} strokeWidth="1" />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={COLORS.border} strokeWidth="1" />;
        })}
        <polygon points={toPoints(ideal)} fill="none" stroke={COLORS.amber} strokeWidth="1.5" strokeDasharray="4 3" />
        <polygon points={toPoints(current)} fill={COLORS.teal} fillOpacity="0.28" stroke={COLORS.teal} strokeWidth="2" />
      </svg>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS.teal, display: "inline-block" }} /> 現状
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 2, background: COLORS.amber, display: "inline-block" }} /> 目標とする状態
        </span>
      </div>
    </div>
  );
}

function StepCard({ icon, title, body }) {
  const Icon = icon;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 22, flex: 1, minWidth: 220 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(244,105,25,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={19} color={COLORS.teal} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15.5, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

// 実務経験者のプロフィールプレビュー。実在の人物写真は使わず、アプリ内の候補一覧と同じ
// 「イニシャル入りの丸いアバター」で表現する。中身はprisma/seed.jsのサンプル人材と同じもの。
function TalentPreviewCard({ name, title, years, tags, gradientFrom, gradientTo }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 22, flex: 1, minWidth: 240 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, color: COLORS.onAccent,
          }}
        >
          {name[0]}
        </div>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>{name}</div>
          <div style={{ fontSize: 11.5, color: COLORS.muted }}>{title}</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 12 }}>実務経験年数: {years}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tags.map((t) => (
          <span key={t} style={{ fontSize: 11, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "2px 8px", color: COLORS.muted }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
function StatsBand() {
  const stats = [
    { value: "10軸", label: "課題を構造的に可視化" },
    { value: "月10h〜", label: "業務委託で身軽に伴走" },
    { value: "無料", label: "AI課題診断・スキルマップ生成" },
  ];
  return (
    <section style={{ background: COLORS.tealDim, padding: "34px 24px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center", minWidth: 160 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, color: COLORS.onAccent }}>{s.value}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="app-root">
      <GlobalStyle />
      <div style={{ position: "relative" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 480,
            background: "linear-gradient(120deg, rgba(244,105,25,0.14) 0%, rgba(27,58,99,0.12) 45%, rgba(244,105,25,0.05) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: -40, right: "8%", width: 340, height: 340, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(27,58,99,0.16), transparent 70%)", pointerEvents: "none",
          }}
        />
        <Nav />

        {/* Hero */}
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 24px 60px", position: "relative" }}>
          <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 700, lineHeight: 1.45, margin: "0 0 14px" }}>
                会社に足りない経験を、<br />必要な分だけ。
              </h1>
              <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.8, maxWidth: 480, margin: "0 0 10px" }}>
                BATTER BOXは、事業フェーズ・組織状況をAIで診断し、会社の成長を止めている課題と、今必要な経験を可視化します。必要な経験を持つ実務経験者が、月10時間からチームに参加します。
              </p>
              <p style={{ fontSize: 13, color: COLORS.faint, lineHeight: 1.8, maxWidth: 480, margin: "0 0 32px", fontStyle: "italic" }}>
                必要なのは、もう1人の社員ではない。月10時間の経験かもしれない。
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a className="btn-primary" href="/signup" style={{ fontSize: 15, padding: "13px 26px" }}>
                  無料で会社を診断する <ArrowRight size={15} />
                </a>
                <a className="btn-ghost" href="/signup" style={{ fontSize: 15, padding: "13px 26px" }}>
                  人材として登録する
                </a>
              </div>
            </div>
            <div style={{ width: 280, flexShrink: 0, margin: "0 auto" }}>
              <HeroRadarPreview />
            </div>
          </div>
        </section>

        <StatsBand />

        {/* Steps */}
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 24px 70px" }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <StepCard icon={Sparkles} title="AIとの対話で課題を診断" body="会社の基本情報を入力するだけで、AIが業種・フェーズに即した質問を重ね、本質的なボトルネックを10軸で可視化します。" />
            <StepCard icon={Target} title="根拠付きで人材を提案" body="診断結果と、実務経験者のスキルマップを照合。なぜその人が合うのか、根拠を示した上で複数名を提案します。" />
            <StepCard icon={Handshake} title="月10時間から伴走開始" body="採用ではなく業務委託。必要なタイミングで、必要な経験だけを取り入れられます。メッセージ機能でそのままやり取りも可能です。" />
          </div>
        </section>

        {/* 月10時間の価値 */}
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px 70px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: "clamp(20px, 3.5vw, 26px)", lineHeight: 1.5 }}>
              必要なのは、もう1人の社員ではない。<br />月10時間の経験かもしれない。
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 26 }}>
              <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500, marginBottom: 10 }}>正社員採用の場合</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13.5, color: COLORS.text, lineHeight: 2.1 }}>
                <li>月60〜100万円ほどの人件費(目安)</li>
                <li>週40時間の稼働が前提</li>
                <li>長期の雇用契約</li>
                <li>採用まで2〜6ヶ月程度</li>
                <li>ミスマッチ時のリスクが大きい</li>
              </ul>
            </div>
            <div style={{ flex: 1, minWidth: 260, background: COLORS.text, border: `1px solid ${COLORS.text}`, borderRadius: 16, padding: 26 }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: 10 }}>BATTER BOXの場合</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13.5, color: COLORS.onAccent, lineHeight: 2.1 }}>
                <li>月10時間〜、必要な分だけ</li>
                <li>今必要な経験だけをピンポイントで</li>
                <li>業務委託、3ヶ月単位でも利用可能</li>
                <li>診断からスピーディに提案</li>
                <li>正社員採用の前段階としても</li>
              </ul>
            </div>
          </div>
          <p style={{ fontSize: 11, color: COLORS.faint, marginTop: 12 }}>
            ※ 上記の金額・期間は目安の一例です。実際の条件は個別の契約により異なります。
          </p>
        </section>

        {/* For companies / For talent */}
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "20px 24px 80px", display: "flex", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 300, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(244,105,25,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={21} color={COLORS.teal} />
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500, margin: "16px 0 6px" }}>企業の方へ</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, lineHeight: 1.5, margin: "0 0 12px", color: COLORS.tealDim }}>
              顧問でも、社員でも、アルバイトでもない。<br />現場を本気で動かす実務経験者を。
            </h2>
            <p style={{ fontSize: 13.5, color: COLORS.muted, lineHeight: 1.8, marginBottom: 16 }}>
              「あと少しの実行経験があれば前に進むのに」——資金やプロダクトが揃っていても、実務を巻き取れる人材の不在で成長が止まっていませんか。AI課題診断は無料で、診断だけで終えることもできます。
            </p>
            <a href="/signup" style={{ color: COLORS.teal, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
              無料でAI課題診断を受ける <ArrowRight size={13} />
            </a>
          </div>
          <div style={{ flex: 1, minWidth: 300, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(27,58,99,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={21} color={COLORS.amber} />
            </div>
            <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 500, margin: "16px 0 6px" }}>実務経験者の方へ</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, lineHeight: 1.5, margin: "0 0 12px", color: "#1B3A63" }}>
              スキルマップで、<br />あなたの強みを可視化する。
            </h2>
            <p style={{ fontSize: 13.5, color: COLORS.muted, lineHeight: 1.8, marginBottom: 16 }}>
              豊富な経験を持ちながら、活躍の場が限られていませんか。職務経歴を入力するだけで、AIがあなた専用のスキルマップを無料で生成。副業ではなく、経験を価値として再定義する場です。
            </p>
            <a href="/signup" style={{ color: COLORS.amber, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
              無料でスキルマップを作る <ArrowRight size={13} />
            </a>
          </div>
        </section>

        {/* Talent preview(必要な経験を持つ人材の例) */}
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px 70px" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>こんな経験を持つ人材が登録しています</div>
            <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 4 }}>プラットフォーム上のプロフィールの一例です</div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <TalentPreviewCard
              name="宮崎 大輔" title="元人事責任者 / シリーズA〜B 3社経験" years="15年以上"
              tags={["採用・組織", "経営体制", "オペレーション"]}
              gradientFrom={COLORS.tealDim} gradientTo={COLORS.teal}
            />
            <TalentPreviewCard
              name="小池 美咲" title="元CFO室 / 管理会計・資金調達支援" years="15年以上"
              tags={["財務・管理会計", "資金調達", "経営体制"]}
              gradientFrom="#0B2647" gradientTo={COLORS.amber}
            />
            <TalentPreviewCard
              name="遠藤 慧" title="元セールスイネーブルメント責任者" years="10〜15年"
              tags={["セールス基盤", "マーケティング", "カスタマーサクセス"]}
              gradientFrom={COLORS.tealDim} gradientTo={COLORS.teal}
            />
          </div>
        </section>

        {/* Differentiation */}
        <section style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 70px", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", fontSize: 13, color: COLORS.muted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><TrendingUp size={14} color={COLORS.teal} /> 知見の共有ではなく、実行力の提供</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><MessageSquare size={14} color={COLORS.teal} /> マッチング後はそのままメッセージで連絡可能</span>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, textAlign: "center", margin: "0 0 28px" }}>よくある質問</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { q: "診断だけ受けて、そのまま利用しなくても大丈夫ですか?", a: "はい。AI企業診断・Growth Mapの作成まではすべて無料で、そこで終えていただいても構いません。提案された人材と話してみるかどうかは、診断結果を見てから判断できます。" },
              { q: "料金はどのくらいかかりますか?", a: "月10時間からの業務委託が基本単価です。稼働時間・期間は案件ごとに個別見積もりになります(β版のため、金額の目安は今後公開予定です)。" },
              { q: "採用ではなく業務委託なのはなぜですか?", a: "正社員採用は、採用コスト・給与・社会保険・採用期間・ミスマッチリスクが伴います。BATTER BOXは「今必要な経験だけ」を、月10時間という小さな単位から始められる業務委託の形にしています。" },
              { q: "どんな人が登録しているのですか?", a: "事業責任者・CFO・CMO・人事責任者など、特定領域で実務の意思決定を担ってきた実務経験者です。登録時にAIがスキルマップを生成し、審査を経てから企業への提案対象になります。" },
              { q: "診断結果はどのくらい正確ですか?", a: "AIとの対話内容と、業種・フェーズ等の情報をもとにスコアリングしています。対話で直接触れた領域は具体的な根拠を、触れていない領域は推定である旨を明記して表示しています。" },
              { q: "支援が始まった後の進捗はどう管理しますか?", a: "マッチング後はプロジェクト画面でタスク・KPI・稼働ログを共有できます。3ヶ月ごとの再診断で、スコアがどう変化したかも確認できます。" },
            ].map((item) => (
              <div key={item.q} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{item.q}</div>
                <div style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.8 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 最終CTA */}
        <section style={{ background: COLORS.text, padding: "60px 24px", textAlign: "center" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: COLORS.onAccent, margin: "0 0 12px" }}>
            会社に足りない経験を、必要な分だけ。
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "0 0 28px" }}>
            まずは無料のAI企業診断から。5分ほどで、御社のGrowth Mapが見えてきます。
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn-primary" href="/signup" style={{ fontSize: 15, padding: "13px 26px" }}>
              無料で会社を診断する <ArrowRight size={15} />
            </a>
            <a className="btn-ghost" href="/signup" style={{ fontSize: 15, padding: "13px 26px", background: "transparent", color: COLORS.onAccent, borderColor: "rgba(255,255,255,0.3)" }}>
              人材として登録する
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${COLORS.border}`, padding: "24px", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", fontSize: 12, color: COLORS.faint, fontFamily: FONT_BODY, flexWrap: "wrap" }}>
            <a href="/legal/terms" style={{ color: COLORS.faint }}>利用規約</a>
            <a href="/legal/privacy" style={{ color: COLORS.faint }}>プライバシーポリシー</a>
            <a href="/security" style={{ color: COLORS.faint }}>セキュリティについて</a>
            <a href="/company" style={{ color: COLORS.faint }}>会社概要</a>
            <a href="/contact" style={{ color: COLORS.faint }}>お問い合わせ</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
