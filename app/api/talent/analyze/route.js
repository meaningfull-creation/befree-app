import { NextResponse } from "next/server";
import { callClaudeJSON } from "@/lib/claude";
import { clampAxisScores } from "@/lib/axes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/errorLog";
import { buildTalentSystemPrompt, buildTalentAnalysisPrompt } from "@/lib/talentPrompts";

// POST /api/talent/analyze
// 認証は必須ではない(未ログインでもスキル解析を進められる。アカウント作成は
// 結果が出た後にまとめて行う設計 — /api/talent/claim 参照)。
// 実務経験者アカウントでログイン済みの場合のみ、その場でDB保存する。
// body: { talentForm: { name, title, industry, years, summary } }
// returns: { scores, phases, bottlenecks, summary, talentId, talentSkillMapId }
export async function POST(req) {
  try {
    const user = await getCurrentUser();
    const isTalentUser = !!(user && user.role === "talent");

    const { talentForm } = await req.json();
    if (!talentForm?.name) {
      return NextResponse.json({ error: "talentForm.name is required" }, { status: 400 });
    }

    const result = await callClaudeJSON(buildTalentSystemPrompt(), buildTalentAnalysisPrompt(talentForm));
    const scores = clampAxisScores(result.scores, 30);
    const phases = Array.isArray(result.phases) ? result.phases : [];
    const bottlenecks = Array.isArray(result.bottlenecks) ? result.bottlenecks : [];

    // 同一アカウントでの再解析は、新しいTalentを作らず既存プロフィールを更新し、
    // スキルマップだけ新規追加する(履歴として残す)。
    let talentId = isTalentUser ? user.talentId : null;
    let talentSkillMapId = null;
    let talentStatus = "pending";
    if (isTalentUser) {
    try {
      if (talentId) {
        const skillMap = await prisma.talentSkillMap.create({
          data: { talentId, axisScores: scores, phases, bottlenecks, summary: result.summary || null },
        });
        const updated = await prisma.talent.update({
          where: { id: talentId },
          data: {
            title: talentForm.title,
            industry: talentForm.industry || null,
            years: talentForm.years,
            bio: talentForm.summary || null,
          },
        });
        talentSkillMapId = skillMap.id;
        talentStatus = updated.status;
      } else {
        const talent = await prisma.talent.create({
          data: {
            name: talentForm.name,
            title: talentForm.title,
            industry: talentForm.industry || null,
            years: talentForm.years,
            bio: talentForm.summary || null,
            skillMaps: {
              create: [{ axisScores: scores, phases, bottlenecks, summary: result.summary || null }],
            },
            capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
          },
          include: { skillMaps: true },
        });
        talentId = talent.id;
        talentSkillMapId = talent.skillMaps[0]?.id || null;
        talentStatus = talent.status;
        await prisma.user.update({ where: { id: user.id }, data: { talentId } });
      }
    } catch (persistErr) {
      // DB未接続でもAI解析自体は継続できるよう、永続化の失敗は握りつぶしてログのみ残す
      console.error("failed to persist talent skill map:", persistErr.message);
    }
    }

    return NextResponse.json({
      scores,
      phases,
      bottlenecks,
      summary: result.summary || null,
      talentId,
      talentSkillMapId,
      talentStatus,
    });
  } catch (e) {
    await logError("api/talent/analyze", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
