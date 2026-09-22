import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMatchIfAuthorized } from "@/lib/matchAccess";
import { callClaudeJSON } from "@/lib/claude";
import { buildContractSuggestionSystemPrompt, buildContractSuggestionPrompt, AXIS_LABEL_BY_KEY } from "@/lib/contractSuggestionPrompts";

// AI呼び出しを含むため、Vercelの関数タイムアウトに余裕を持たせる
export const maxDuration = 60;

// POST /api/matches/[matchId]/suggest-contract-terms
// 認証必須(role=company、そのマッチングの企業側当事者のみ)。
// 「契約条件のパターンをAIで複数出す」という要望への対応。
// 重要: このプラットフォームには実際の相場データの蓄積がないため、AIの提案は
// あくまで一般的な感覚に基づく「たたき台」であり、正確な相場ではない。
// フロントエンド側にもその旨を明示すること。
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const authorized = await getMatchIfAuthorized(params.matchId, user);
  if (!authorized) return NextResponse.json({ error: "アクセス権がありません" }, { status: 403 });
  if (authorized.myRole !== "company") {
    return NextResponse.json({ error: "この操作は企業アカウントのみ行えます" }, { status: 403 });
  }

  const { match } = authorized;
  const company = match.companySkillMap.company;
  const talent = match.talentSkillMap.talent;
  const topIssues = match.companySkillMap.topIssueDetails || [];
  const topIssue = topIssues[0] || null;
  const axisLabel = topIssue ? AXIS_LABEL_BY_KEY[topIssue.axisKey] : null;

  try {
    const result = await callClaudeJSON(
      buildContractSuggestionSystemPrompt(),
      buildContractSuggestionPrompt({
        companyName: company.name,
        revenue: company.revenue,
        industry: company.industry,
        axisLabel: axisLabel || "(診断結果から特定の課題を絞り込めていません)",
        priority: topIssue?.priority,
        currentState: topIssue?.currentState,
        talentTitle: talent.title,
        talentYears: talent.years,
      }),
      800, // 3パターン分のJSONのみ。小さく絞って応答を速くする
      { fast: true } // 提案フォームを開いた直後に自動生成されるため速度を優先
    );

    const patterns = Array.isArray(result.patterns)
      ? result.patterns
          .filter((p) => Number.isFinite(Number(p.monthlyHours)) && Number.isFinite(Number(p.companyAmount)))
          .map((p) => ({
            label: typeof p.label === "string" ? p.label.slice(0, 20) : "提案",
            monthlyHours: Math.max(1, Math.round(Number(p.monthlyHours))),
            companyAmount: Math.max(1000, Math.round(Number(p.companyAmount) / 1000) * 1000),
            rationale: typeof p.rationale === "string" ? p.rationale.slice(0, 150) : "",
          }))
          .slice(0, 3)
      : [];

    if (patterns.length === 0) {
      return NextResponse.json({ error: "提案の生成に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ patterns });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
