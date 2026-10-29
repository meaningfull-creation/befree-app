import { prisma } from "@/lib/prisma";
import { AdminShell, COLORS, FONT_MONO } from "@/lib/adminTheme";
import { TALENT_CSV_HEADERS, COMPANY_CSV_HEADERS } from "@/lib/adminExport";

export const dynamic = "force-dynamic"; // 常に最新の件数を表示する

async function getCounts() {
  const [talents, talentsAnalyzed, companies, companiesDiagnosed] = await Promise.all([
    prisma.talent.count(),
    prisma.talent.count({ where: { skillMaps: { some: {} } } }),
    prisma.company.count(),
    prisma.company.count({ where: { skillMaps: { some: {} } } }),
  ]);
  return { talents, talentsAnalyzed, companies, companiesDiagnosed };
}

function ExportCard({ title, description, count, analyzedLabel, href, headers }) {
  return (
    <div className="admin-card" style={{ flex: 1, minWidth: 320 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 20 }}>{count}</div>
      </div>
      <p style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.7, margin: "0 0 10px" }}>
        {description}
        <br />
        {analyzedLabel}
      </p>
      <details style={{ marginBottom: 14 }}>
        <summary style={{ fontSize: 12, color: COLORS.muted, cursor: "pointer" }}>
          出力される列({headers.length}列)を見る
        </summary>
        <div style={{ fontSize: 11.5, color: COLORS.muted, lineHeight: 1.9, marginTop: 8 }}>
          {headers.join("、")}
        </div>
      </details>
      <a href={href} className="admin-btn" style={{ display: "inline-block" }}>CSVをダウンロード</a>
    </div>
  );
}

export default async function ExportsPage() {
  const c = await getCounts();

  return (
    <AdminShell current="exports">
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 6px" }}>エクスポート</h1>
      <p style={{ color: COLORS.muted, fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.8 }}>
        登録されているデータを一括でダウンロードできます。文字コードはUTF-8(BOM付き)なので、Excelでそのまま開けます。
        絞り込んだ状態で取りたい場合は、企業一覧・人材一覧で検索してから各ページの「CSVダウンロード」をお使いください。
      </p>

      <div className="admin-card" style={{ marginBottom: 24, borderColor: COLORS.teal }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>まとめてダウンロード</div>
        <p style={{ fontSize: 12.5, color: COLORS.muted, lineHeight: 1.7, margin: "0 0 14px" }}>
          人材({c.talents}件)と企業({c.companies}件)のCSVを、1つのZIPファイルにまとめて取得します。
          ファイル名には取得日が入ります。
        </p>
        <a href="/admin/exports/all.zip" className="admin-btn" style={{ display: "inline-block" }}>
          ZIPでまとめてダウンロード
        </a>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <ExportCard
          title="人材"
          count={c.talents}
          description="氏名・連絡先・経歴・稼働状況に加えて、スキルマップの10軸の配点(合計100点)を1軸1列で出力します。"
          analyzedLabel={`うち${c.talentsAnalyzed}件はAI自己分析まで完了しています(残りは配点が空欄になります)。`}
          href="/admin/talents/export.csv"
          headers={TALENT_CSV_HEADERS}
        />
        <ExportCard
          title="企業"
          count={c.companies}
          description="会社名・連絡先・会社情報に加えて、課題診断の10軸スコア(低いほど深刻)を1軸1列で出力します。"
          analyzedLabel={`うち${c.companiesDiagnosed}件はAI課題診断まで完了しています(残りはスコアが空欄になります)。`}
          href="/admin/companies/export.csv"
          headers={COMPANY_CSV_HEADERS}
        />
      </div>

      <div className="admin-card" style={{ marginTop: 24, fontSize: 12.5, color: COLORS.muted, lineHeight: 1.8 }}>
        <span style={{ fontFamily: FONT_MONO, color: COLORS.amber }}>Note</span> —
        エクスポートには、アカウント作成だけで離脱した方・入力途中の方も含まれます(「登録状況」列で見分けられます)。
        氏名・会社名が未入力の場合は「(氏名未入力)」「(会社名未入力)」と出力されるので、メールアドレス列で識別してください。
        個人情報を含むため、ダウンロードしたファイルの取り扱いにはご注意ください。
      </div>
    </AdminShell>
  );
}
