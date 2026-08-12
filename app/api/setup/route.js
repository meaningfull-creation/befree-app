import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwordHash";
import { TALENT_SEED, COMPANY_SEED } from "@/lib/seedData";

// GET /api/setup?key=SETUP_KEY
//
// ターミナル操作なしで、本番環境の初期セットアップ(管理者アカウント作成・サンプルデータ投入)を
// 完了させるための一度きりのエンドポイント。ブラウザでこのURLを開くだけで実行できる。
//
// - Vercelの環境変数 SETUP_KEY を設定し、その値をURLの ?key= に付けてアクセスする
// - 何度アクセスしても安全(冪等)。既に管理者・サンプルデータがあれば何もしない
// - SETUP_KEY が未設定、または一致しない場合は 403 を返す
export async function GET(req) {
  const setupKey = process.env.SETUP_KEY;
  if (!setupKey) {
    return NextResponse.json(
      { error: "SETUP_KEY が設定されていません。Vercelの環境変数にSETUP_KEYを追加してから再度アクセスしてください。" },
      { status: 403 }
    );
  }

  const providedKey = new URL(req.url).searchParams.get("key");
  if (providedKey !== setupKey) {
    return NextResponse.json({ error: "keyが正しくありません。" }, { status: 403 });
  }

  const result = { admin: null, talentsSeeded: 0, companiesSeeded: 0, messages: [] };

  try {
    // --- 管理者アカウント(既にあれば何もしない) ---
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@befree.local";
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
      result.messages.push(`管理者アカウントは既に作成済みです(${adminEmail})`);
    } else {
      const password = process.env.SEED_ADMIN_PASSWORD || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { hash, salt } = hashPassword(password);
      await prisma.user.create({
        data: { email: adminEmail, passwordHash: hash, passwordSalt: salt, role: "admin" },
      });
      result.admin = { email: adminEmail, password: process.env.SEED_ADMIN_PASSWORD ? "(.envで指定した値)" : password };
      result.messages.push("管理者アカウントを新規作成しました。下記のメールアドレス・パスワードを必ず控えてください(このパスワードは二度と表示されません)。");
    }

    // --- サンプル人材・企業(1件でも既にあればスキップ = 重複投入防止) ---
    const talentCount = await prisma.talent.count();
    if (talentCount === 0) {
      for (const t of TALENT_SEED) {
        await prisma.talent.create({
          data: {
            name: t.name,
            title: t.title,
            years: t.years,
            bio: t.bio,
            status: "approved",
            skillMaps: { create: [{ axisScores: t.axisScores, phases: t.phases, bottlenecks: t.bottlenecks, summary: t.bio }] },
            capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
          },
        });
        result.talentsSeeded += 1;
      }
    } else {
      result.messages.push(`人材データは既に${talentCount}件あるため、サンプル投入はスキップしました。`);
    }

    const companyCount = await prisma.company.count();
    if (companyCount === 0) {
      for (const c of COMPANY_SEED) {
        await prisma.company.create({
          data: {
            name: c.name,
            industry: c.industry,
            headcount: c.headcount,
            phase: c.phase,
            revenue: c.revenue,
            skillMaps: { create: [{ axisScores: c.axisScores, summary: c.summary }] },
          },
        });
        result.companiesSeeded += 1;
      }
    } else {
      result.messages.push(`企業データは既に${companyCount}件あるため、サンプル投入はスキップしました。`);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: `セットアップ中にエラーが発生しました: ${e.message}。DATABASE_URLが正しく設定されているか、マイグレーションが完了しているか確認してください。` },
      { status: 500 }
    );
  }
}
