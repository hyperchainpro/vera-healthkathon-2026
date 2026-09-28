import { db } from "../src/lib/db";

async function main() {
  // Check by case ID
  const byCase = await db.episode.findFirst({ where: { caseId: "PNEU-2026-0971" } });
  console.log("By caseId PNEU-2026-0971:");
  console.log("  ID:", byCase?.id);
  console.log("  Stripped (first 80):", byCase?.emrTextStrip.substring(0, 80));

  // Check by cuid from API
  const byId = await db.episode.findUnique({ where: { id: "cmukw7rub03qqo9omtedyz1jq" } });
  console.log("\nBy ID cmukw7rub03qqo9omtedyz1jq:");
  console.log("  Case ID:", byId?.caseId);
  console.log("  Stripped (first 80):", byId?.emrTextStrip.substring(0, 80));
}

main().catch(console.error).finally(() => db.$disconnect());
