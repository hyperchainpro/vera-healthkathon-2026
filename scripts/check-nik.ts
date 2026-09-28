import { db } from "../src/lib/db";

async function main() {
  const total = await db.episode.count();
  const high = await db.episode.count({ where: { flagLevel: "HIGH" } });
  const pneu = await db.episode.count({ where: { diseaseName: "Pneumonia" } });
  const stroke = await db.episode.count({ where: { diseaseName: "Stroke (Ischemic)" } });
  console.log(`Total: ${total}, HIGH: ${high}, Pneumonia: ${pneu}, Stroke: ${stroke}`);

  const sample = await db.episode.findFirst({ where: { caseId: "PNEU-2026-0971" } });
  console.log(`\nSample PNEU-2026-0971 stripped text:`);
  console.log(sample?.emrTextStrip.substring(0, 250));
}

main().catch(console.error).finally(() => db.$disconnect());
