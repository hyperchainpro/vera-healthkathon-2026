/**
 * VERA Stats API — Dashboard overview metrics
 * GET /api/stats
 *
 * Returns:
 *   - KPI counts (total, redFlag, watch, normal)
 *   - Disease distribution
 *   - Daily upload trend (last 7 days)
 *   - Top 5 Red Flag cases
 *   - Reviewer activity stats
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const episodes = await db.episode.findMany({
      orderBy: { deviationScore: "desc" },
      take: 500,
    });

    const total = episodes.length;
    const redFlags = episodes.filter(e => e.flagLevel === "HIGH").length;
    const watch = episodes.filter(e => e.flagLevel === "MEDIUM").length;
    const normal = episodes.filter(e => e.flagLevel === "LOW").length;

    // Disease distribution
    const byDisease: Record<string, number> = {};
    for (const e of episodes) {
      byDisease[e.diseaseName] = (byDisease[e.diseaseName] || 0) + 1;
    }
    const diseaseDistribution = Object.entries(byDisease).map(([name, count]) => ({ name, count }));

    // Avg score
    const avgScore = episodes.length > 0
      ? episodes.reduce((s, e) => s + (e.deviationScore ?? 0), 0) / episodes.length
      : 0;

    // Top 5 red flags
    const topRedFlags = episodes
      .filter(e => e.flagLevel === "HIGH")
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        caseId: e.caseId,
        diseaseName: e.diseaseName,
        claimedDays: e.claimedDays,
        deviationScore: e.deviationScore ?? 0,
        flagLevel: e.flagLevel,
        createdAt: e.createdAt,
      }));

    // Daily uploads last 7 days (group by day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEpisodes = await db.episode.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, flagLevel: true },
    });

    const dailyUploads: Array<{ date: string; total: number; red: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayEpisodes = recentEpisodes.filter(e =>
        e.createdAt.toISOString().slice(0, 10) === dateStr
      );
      dailyUploads.push({
        date: dateStr,
        total: dayEpisodes.length,
        red: dayEpisodes.filter(e => e.flagLevel === "HIGH").length,
      });
    }

    // Estimated savings (extrapolated to national scale)
    // Per proposal slide 17: 200k cases × Rp 1.5M × 0.5 day cut = Rp 300M/year
    const estSavingsM = (redFlags / 200000 * 300).toFixed(1);
    // Time saved: 36 min per case (45min → 9min audit)
    const estTimeSavedHours = redFlags * 0.6; // 36 min = 0.6 hours

    // User activity (top reviewers)
    const recentLogs = await db.auditLog.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: { user: true },
      take: 100,
    });
    const userActivity: Record<string, { name: string; count: number }> = {};
    for (const log of recentLogs) {
      if (!log.user) continue;
      const key = log.user.email;
      if (!userActivity[key]) userActivity[key] = { name: log.user.name, count: 0 };
      userActivity[key].count++;
    }
    const topReviewers = Object.entries(userActivity)
      .map(([email, data]) => ({ email, name: data.name, actions: data.count }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 5);

    return NextResponse.json({
      kpis: {
        total,
        redFlags,
        watch,
        normal,
        avgScore: parseFloat(avgScore.toFixed(3)),
        estSavingsM,
        estTimeSavedHours: Math.round(estTimeSavedHours),
      },
      diseaseDistribution,
      dailyUploads,
      topRedFlags,
      topReviewers,
    });
  } catch (err) {
    console.error("[VERA] /api/stats error:", err);
    return NextResponse.json({ error: "Stats failed" }, { status: 500 });
  }
}
