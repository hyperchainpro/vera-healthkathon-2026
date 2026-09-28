import { db } from "../src/lib/db";

async function main() {
  const e = await db.episode.findFirst({
    where: { caseId: "PNEU-2026-DEMO-001" },
    include: { labData: true, auditLogs: { take: 1 } },
  });
  console.log("Demo case found:");
  console.log(JSON.stringify(e, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
