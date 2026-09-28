/**
 * VERA Debug — Inspect ANOMALY cases to verify algorithm
 * Run: bun run scripts/seed/debug-anomaly.ts
 */
import { db } from "../../src/lib/db";

async function main() {
  const allEpisodes = await db.episode.findMany({
    include: { labData: true, auditLogs: { take: 1 } },
  });

  console.log(`Total episodes: ${allEpisodes.length}\n`);

  // Group by category from auditLogs metadata
  const categories: Record<string, { total: number; HIGH: number; MEDIUM: number; LOW: number }> = {};

  for (const ep of allEpisodes) {
    const meta = ep.auditLogs[0]?.metadata ? JSON.parse(ep.auditLogs[0].metadata) : {};
    const cat = meta.category ?? "UNKNOWN";
    if (!categories[cat]) categories[cat] = { total: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    categories[cat].total++;
    if (ep.flagLevel === "HIGH") categories[cat].HIGH++;
    else if (ep.flagLevel === "MEDIUM") categories[cat].MEDIUM++;
    else categories[cat].LOW++;
  }

  console.log("Category × Flag distribution:");
  for (const [cat, stats] of Object.entries(categories)) {
    const pct = stats.HIGH / stats.total * 100;
    console.log(`  ${cat.padEnd(12)} total=${stats.total}  HIGH=${stats.HIGH} (${pct.toFixed(1)}%)  MEDIUM=${stats.MEDIUM}  LOW=${stats.LOW}`);
  }

  // Sample one ANOMALY case
  const anomalyHigh = allEpisodes.find(e => {
    const meta = e.auditLogs[0]?.metadata ? JSON.parse(e.auditLogs[0].metadata) : {};
    return meta.category === "ANOMALY" && e.flagLevel === "HIGH";
  });
  const anomalyLow = allEpisodes.find(e => {
    const meta = e.auditLogs[0]?.metadata ? JSON.parse(e.auditLogs[0].metadata) : {};
    return meta.category === "ANOMALY" && e.flagLevel === "LOW";
  });

  console.log("\n=== Sample ANOMALY case scored HIGH ===");
  if (anomalyHigh) {
    console.log(`  Case: ${anomalyHigh.caseId}`);
    console.log(`  Claimed days: ${anomalyHigh.claimedDays}`);
    console.log(`  Deviation score: ${anomalyHigh.deviationScore}`);
    console.log(`  Lab data (per day):`);
    for (const lab of anomalyHigh.labData) {
      console.log(`    ${lab.dayLabel}: leuko=${lab.leukosit}, trombo=${lab.trombosit}, td=${lab.tdSistol}/${lab.tdDiastol}, suhu=${lab.suhu}, gcs=${lab.gcs}`);
    }
  }

  console.log("\n=== Sample ANOMALY case scored LOW (incorrect) ===");
  if (anomalyLow) {
    console.log(`  Case: ${anomalyLow.caseId}`);
    console.log(`  Claimed days: ${anomalyLow.claimedDays}`);
    console.log(`  Deviation score: ${anomalyLow.deviationScore}`);
    console.log(`  Lab data (per day):`);
    for (const lab of anomalyLow.labData) {
      console.log(`    ${lab.dayLabel}: leuko=${lab.leukosit}, trombo=${lab.trombosit}, td=${lab.tdSistol}/${lab.tdDiastol}, suhu=${lab.suhu}, gcs=${lab.gcs}`);
    }
    console.log(`  Stripped EMR text:`);
    console.log(anomalyLow.emrTextStrip);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
