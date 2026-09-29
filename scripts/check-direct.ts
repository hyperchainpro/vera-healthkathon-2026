import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const count = await db.episode.count();
  console.log("Direct Prisma count:", count);
  const sample = await db.episode.findFirst({ where: { caseId: "PNEU-2026-0971" } });
  console.log("Sample ID:", sample?.id);
  console.log("Sample stripped (80 chars):", sample?.emrTextStrip.substring(0, 80));
  await db.$disconnect();
}

main();
