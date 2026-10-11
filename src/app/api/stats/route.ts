/**
 * VERA Stats API — Dashboard overview metrics (RESILIENT VERSION)
 * GET /api/stats
 *
 * Returns safe defaults if DB fails (no more 500 error → no client crash)
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe default response (kalau DB bermasalah)
const SAFE_DEFAULTS = {
  kpis: {
    total: 0,
    redFlags: 0,
    watch: 0,
    normal: 0,
    avgScore: 0,
    estSavingsM: "0",
    estTimeSavedHours: 0,
  },
  diseaseDistribution: [
    { name: "Pneumonia", count: 0 },
    { name: "Stroke (Ischemic)", count: 0 },
  ],
  dailyUploads: Array(7).fill(0).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return { date: date.toISOString().slice(0, 10), total: 0, red: 0 };
  }),
  topRedFlags: [],
  topReviewers: [],
  dbStatus: "disconnected",
};

export async function GET() {
  try {
    // Try to load db — kalau gagal, return safe defaults
    const { db } = await import("@/lib/db");

    let episodes: any[] = [];
    try {
      episodes = await db.episode.findMany({
        orderBy: { deviationScore: "desc" },
        take: 500,
      });
    } catch (dbErr) {
      console.log("[VERA] /api/stats: DB query failed, returning safe defaults");
      return NextResponse.json({ ...SAFE_DEFAULTS, dbStatus: "error", dbError: String(dbErr).slice(0, 100) });
    }

    const total = episodes.length;
    const redFlags = episodes.filter((e: any) => e.flagLevel === "HIGH").length;
    const watch = episodes.filter((e: any) => e.flagLevel === "MEDIUM").length;
    const normal = episodes.filter((e: any) => e.flagLevel === "LOW").length;

    const byDisease: Record<string, number> = {};
    for (const e of episodes) {
      byDisease[e.diseaseName] = (byDisease[e.diseaseName] || 0) + 1;
    }
    const diseaseDistribution = Object.entries(byDisease).map(([name, count]) => ({ name, count }));

    const avgScore = episodes.length > 0
      ? episodes.reduce((s: number, e: any) => s + (e.deviationScore ?? 0), 0) / episodes.length
      : 0;

    const topRedFlags = episodes
      .filter((e: any) => e.flagLevel === "HIGH")
      .slice(0, 5)
      .map((e: any) => ({
        id: e.id,
        caseId: e.caseId,
        diseaseName: e.diseaseName,
        claimedDays: e.claimedDays,
        deviationScore: e.deviationScore ?? 0,
        flagLevel: e.flagLevel,
        createdAt: e.createdAt,
      }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let recentEpisodes: any[] = [];
    let recentLogs: any[] = [];
    try {
      recentEpisodes = await db.episode.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, flagLevel: true },
      });

      recentLogs = await db.auditLog.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: { user: true },
        take: 100,
      });
    } catch (dbErr) {
      console.log("[VERA] /api/stats: recent queries failed");
    }

    const dailyUploads: Array<{ date: string; total: number; red: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayEpisodes = recentEpisodes.filter((e: any) =>
        e.createdAt.toISOString().slice(0, 10) === dateStr
      );
      dailyUploads.push({
        date: dateStr,
        total: dayEpisodes.length,
        red: dayEpisodes.filter((e: any) => e.flagLevel === "HIGH").length,
      });
    }

    const estSavingsM = (redFlags / 200000 * 300).toFixed(1);
    const estTimeSavedHours = redFlags * 0.6;

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
      dbStatus: "connected",
    });
  } catch (err) {
    console.error("[VERA] /api/stats error:", err);
    // Return safe defaults instead of 500 — prevents client crash
    return NextResponse.json({
      ...SAFE_DEFAULTS,
      dbStatus: "fatal_error",
      error: String(err).slice(0, 200),
    });
  }
      }
