import type { AnalyzedPlayer } from "./analyzer";

export interface TrendResult {
  playerName: string;
  insight: string;
  diffs: {
    shootingPctDiff: number;
    boostAvgDiff: number;
    avgSpeedDiff: number;
    goalsDiff: number;
    savesDiff: number;
    assistsDiff: number;
    demosInflictedDiff: number;
    boostWastedPctDiff: number;
  };
}

export function computeTrend(
  current: AnalyzedPlayer,
  averages: Partial<AnalyzedPlayer>,
): TrendResult {
  const diffs = {
    shootingPctDiff: current.shootingPct - (averages.shootingPct ?? current.shootingPct),
    boostAvgDiff: current.boostAvg - (averages.boostAvg ?? current.boostAvg),
    avgSpeedDiff: current.avgSpeed - (averages.avgSpeed ?? current.avgSpeed),
    goalsDiff: current.goals - (averages.goals ?? current.goals),
    savesDiff: current.saves - (averages.saves ?? current.saves),
    assistsDiff: current.assists - (averages.assists ?? current.assists),
    demosInflictedDiff: current.demosInflicted - (averages.demosInflicted ?? current.demosInflicted),
    boostWastedPctDiff: current.boostWastedPct - (averages.boostWastedPct ?? current.boostWastedPct),
  };

  const improvements: string[] = [];
  const declines: string[] = [];

  if (diffs.shootingPctDiff > 5) improvements.push("دقة التسديد");
  else if (diffs.shootingPctDiff < -5) declines.push("دقة التسديد");

  if (diffs.goalsDiff > 1) improvements.push("التسجيل");
  else if (diffs.goalsDiff < -1) declines.push("التسجيل");

  if (diffs.savesDiff > 1) improvements.push("التصدي");
  else if (diffs.savesDiff < -1) declines.push("التصدي");

  if (diffs.assistsDiff > 1) improvements.push("التمريرات الحاسمة");
  else if (diffs.assistsDiff < -1) declines.push("التمريرات الحاسمة");

  if (diffs.boostAvgDiff > 5) improvements.push("إدارة البوست");
  else if (diffs.boostAvgDiff < -5) declines.push("إدارة البوست");

  if (diffs.boostWastedPctDiff < -5) improvements.push("ترشيد البوست");
  else if (diffs.boostWastedPctDiff > 5) declines.push("ترشيد البوست");

  if (diffs.avgSpeedDiff > 150) improvements.push("السرعة");
  else if (diffs.avgSpeedDiff < -150) declines.push("السرعة");

  if (diffs.demosInflictedDiff > 1) improvements.push("أعمال demos");
  else if (diffs.demosInflictedDiff < -1) declines.push("أعمال demos");

  let insight = "";
  if (improvements.length > 0 && declines.length > 0) {
    insight = `تحسنت في: ${improvements.join("، ")}. لكن تراجعت في: ${declines.join("، ")}.`;
  } else if (improvements.length > 0) {
    insight = `أداء أفضل! تطور ملحوظ في: ${improvements.join("، ")}. استمر!`;
  } else if (declines.length > 0) {
    insight = `تراجع طفيف في: ${declines.join("، ")}. راجع هذي النقاط`;
  } else {
    insight = "مستوى ثابت. جرب تشوف نقاط ضعف جديدة";
  }

  return { playerName: current.playerName, insight, diffs };
}

export function computeTeamAnalysis(
  bluePlayers: AnalyzedPlayer[],
  orangePlayers: AnalyzedPlayer[],
): { blue: any; orange: any; insight: string } {
  const aggregate = (players: AnalyzedPlayer[]) => ({
    shots: players.reduce((s, p) => s + p.shots, 0),
    goals: players.reduce((s, p) => s + p.goals, 0),
    saves: players.reduce((s, p) => s + p.saves, 0),
    assists: players.reduce((s, p) => s + p.assists, 0),
    score: players.reduce((s, p) => s + p.score, 0),
    boostCollected: Math.round(players.reduce((s, p) => s + p.boostCollected, 0)),
    avgSpeed: players.length > 0 ? Math.round(players.reduce((s, p) => s + p.avgSpeed, 0) / players.length) : 0,
    demosInflicted: players.reduce((s, p) => s + p.demosInflicted, 0),
    demosTaken: players.reduce((s, p) => s + p.demosTaken, 0),
  });

  const blue = aggregate(bluePlayers);
  const orange = aggregate(orangePlayers);

  const parts: string[] = [];
  if (blue.shots > orange.shots) parts.push("الـ Blue سددوا أكثر");
  else if (orange.shots > blue.shots) parts.push("الـ Orange سددوا أكثر");

  if (blue.boostCollected > orange.boostCollected) parts.push("وجمعوا بوست أكثر");
  else if (orange.boostCollected > blue.boostCollected) parts.push("جمعوا بوست أكثر");

  if (blue.avgSpeed > orange.avgSpeed) parts.push("وكانوا أسرع");
  else if (orange.avgSpeed > blue.avgSpeed) parts.push("وكانوا أسرع");

  parts.push(`- Blue: ${blue.goals} goals, Orange: ${orange.goals} goals`);

  return {
    blue,
    orange,
    insight: parts.join(". "),
  };
}
