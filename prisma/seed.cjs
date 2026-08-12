// 実行方法: npx prisma db seed
// (package.json の "prisma".seed 設定により、`npx prisma migrate dev` 実行時にも自動で走る)
//
// 本番(Vercel等)では、ターミナルなしで同じ処理をブラウザから実行できる
// GET /api/setup?key=... エンドポイント(app/api/setup/route.js)を使うことを推奨する。
// こちらはローカル開発環境向け。

const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@befree.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`admin user already exists: ${email}`);
    return;
  }
  const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");
  const { hash, salt } = hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash: hash, passwordSalt: salt, role: "admin" },
  });
  console.log("---------------------------------------------");
  console.log("管理者アカウントを作成しました。/login からログインしてください。");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log("  (ランダム生成されたパスワードです。必ず控えてください)");
  }
  console.log("---------------------------------------------");
}

async function main() {
  // lib/seedData.js はESM(package.jsonのtype:module)なので、.cjsからは動的importで読み込む
  const { TALENT_SEED, COMPANY_SEED } = await import("../lib/seedData.js");

  await seedAdmin();

  for (const t of TALENT_SEED) {
    const talent = await prisma.talent.create({
      data: {
        name: t.name,
        title: t.title,
        years: t.years,
        bio: t.bio,
        status: "approved", // シードデータは初期状態から承認済みにしておく
        skillMaps: {
          create: [{ axisScores: t.axisScores, phases: t.phases, bottlenecks: t.bottlenecks, summary: t.bio }],
        },
        capacity: { create: { maxConcurrentEngagements: 3, currentCommittedHours: 0 } },
      },
    });
    console.log(`talent seeded: ${talent.name}`);
  }

  for (const c of COMPANY_SEED) {
    const company = await prisma.company.create({
      data: {
        name: c.name,
        industry: c.industry,
        headcount: c.headcount,
        phase: c.phase,
        revenue: c.revenue,
        skillMaps: {
          create: [{ axisScores: c.axisScores, summary: c.summary }],
        },
      },
    });
    console.log(`company seeded: ${company.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
