export interface AnalyzedPlayer {
  playerName: string;
  team: string;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  score: number;
  shootingPct: number;
  boostAvg: number;
  boostCollected: number;
  boostStolen: number;
  bigPads: number;
  smallPads: number;
  boostWastedPct: number;
  overfillPct: number;
  percentZeroBoost: number;
  percentFullBoost: number;
  avgSpeed: number;
  totalDistance: number;
  percentSupersonic: number;
  timeSlowSpeed: number;
  groundPct: number;
  airPct: number;
  percentOffensive: number;
  percentDefensive: number;
  percentNeutral: number;
  distBall: number;
  distMates: number;
  timeBehindBall: number;
  timeInfrontBall: number;
  demosInflicted: number;
  demosTaken: number;
  countPowerslide: number;
  goalsAgainstLastDefender: number;
  tips: Tip[];
}

export interface Tip {
  category: string;
  priority: "high" | "medium" | "low";
  message: string;
}

export interface AnalysisResult {
  gameMode: string;
  mapName: string;
  duration: number;
  overtime: boolean;
  playlist: string;
  blueName: string;
  orangeName: string;
  blueGoals: number;
  orangeGoals: number;
  players: AnalyzedPlayer[];
}

function pct(value: number, total: number): number {
  if (!total) return 0;
  return (value / total) * 100;
}

export function analyzePlayers(players: any[], blueName: string, orangeName: string, gameMode: string): AnalyzedPlayer[] {
  return players.map((p) => {
    const s = p.stats || {};
    const core = s.core || {};
    const boost = s.boost || {};
    const movement = s.movement || {};
    const positioning = s.positioning || {};
    const demo = s.demo || {};
    const ball = s.ball || {};

    const groundPct = movement.time_slow_speed != null && movement.time_supersonic_speed != null && movement.time_boost_speed != null
      ? 100 - pct(movement.time_supersonic_speed + movement.time_boost_speed, movement.time_supersonic_speed + movement.time_boost_speed + movement.time_slow_speed)
      : 0;
    const airPct = positioning.time_defensive_third != null ? 100 - groundPct : 0;

    const totalTime = (positioning.time_offensive_third || 0) + (positioning.time_defensive_third || 0) + (positioning.time_neutral_third || 0);

    const analyzed: AnalyzedPlayer = {
      playerName: p.name || "Unknown",
      team: p.team || "blue",
      goals: core.goals ?? 0,
      assists: core.assists ?? 0,
      saves: core.saves ?? 0,
      shots: core.shots ?? 0,
      score: core.score ?? 0,
      shootingPct: core.shooting_percentage ?? 0,
      boostAvg: boost.boost_avg ?? 0,
      boostCollected: boost.boost_collected ?? 0,
      boostStolen: boost.boost_stolen ?? 0,
      bigPads: boost.num_pads_big ?? 0,
      smallPads: boost.num_pads_small ?? 0,
      boostWastedPct: boost.wasted_collection ?? 0,
      overfillPct: boost.wasted_usage ?? 0,
      percentZeroBoost: boost.percent_zero_boost ?? 0,
      percentFullBoost: boost.percent_full_boost ?? 0,
      avgSpeed: movement.avg_speed ?? 0,
      totalDistance: movement.total_distance ?? 0,
      percentSupersonic: movement.percent_supersonic_speed ?? 0,
      timeSlowSpeed: movement.percent_slow_speed ?? 0,
      groundPct,
      airPct,
      percentOffensive: totalTime ? pct(positioning.time_offensive_third, totalTime) : 0,
      percentDefensive: totalTime ? pct(positioning.time_defensive_third, totalTime) : 0,
      percentNeutral: totalTime ? pct(positioning.time_neutral_third, totalTime) : 0,
      distBall: positioning.avg_distance_to_ball ?? 0,
      distMates: positioning.avg_distance_to_mates ?? 0,
      timeBehindBall: positioning.time_behind_ball ?? 0,
      timeInfrontBall: positioning.time_infront_ball ?? 0,
      demosInflicted: demo.demos_inflicted ?? 0,
      demosTaken: demo.demos_taken ?? 0,
      countPowerslide: p.count_powerslide ?? 0,
      goalsAgainstLastDefender: ball.goals_against_while_last_defender ?? 0,
      tips: [],
    };

    analyzed.tips = generateTips(analyzed, gameMode);
    return analyzed;
  });
}

function generateTips(p: AnalyzedPlayer, gameMode: string): Tip[] {
  const tips: Tip[] = [];

  if (p.shootingPct < 25 && p.shots >= 3) {
    tips.push({ category: "shooting", priority: "high", message: "دقتك في التسديد تصدق؟ ركز على التمرين في Free Play أو خذ كورس تدريبي" });
  } else if (p.shootingPct < 33 && p.shots >= 3) {
    tips.push({ category: "shooting", priority: "medium", message: "حاول تسدد بدقة أكبر، لا تطلق الكرة عشوائي" });
  }

  if (p.shots < 2 && (gameMode === "1v1" || gameMode === "2v2")) {
    tips.push({ category: "shooting", priority: "high", message: "تصير قليل تسديد! خذ وضعية هجومية أكثر" });
  }

  if (p.goals === 0 && p.shots > 0) {
    tips.push({ category: "shooting", priority: "high", message: "تسدد بس ما تجيب goal. جرب تقفل على الزوايا وتصير أقرب للمرمى" });
  }

  if (p.boostAvg < 25) {
    tips.push({ category: "boost", priority: "high", message: `معدل البوست عندك ${p.boostAvg}. والله إن سرعة السيارة العادية أسرع منك. تعلم تجمع البوست وأنت تلعب` });
  } else if (p.boostAvg < 40) {
    tips.push({ category: "boost", priority: "medium", message: `معدل البوست ${p.boostAvg}. حاول تجمع boost pads الصغيرة وأنت رايح جاي` });
  }

  if (p.boostWastedPct > 30) {
    tips.push({ category: "boost", priority: "high", message: "تهدر بوست كثير! استخدم boost بذكاء، مو لازم تكون مسرع دايم" });
  }

  if (p.bigPads < 10 && p.smallPads < 20) {
    tips.push({ category: "boost", priority: "medium", message: "ما تجمع boost pads كفاية. تعلم مسارات جمع البوست" });
  }

  if (p.percentZeroBoost > 20) {
    tips.push({ category: "boost", priority: "medium", message: "وقت كبير وانت بصفر بوست. حاول ما توصل للصفر عشان تقدر تدافع" });
  }

  if (p.percentOffensive > 60) {
    tips.push({ category: "positioning", priority: "high", message: "قاعد تقضي وقت كثير في هجوم. راجع positioning حق الدفاع" });
  } else if (p.percentOffensive < 20) {
    tips.push({ category: "positioning", priority: "medium", message: "قاعد تلعب دفاعي كثير. جرب تتقدم وتضغط أكثر" });
  }

  if (p.percentDefensive > 60) {
    tips.push({ category: "positioning", priority: "medium", message: "أغلب وقتك في الدفاع. حاول تطلع وتلعب هجومي أكثر" });
  }

  if (Math.abs(p.percentOffensive - p.percentDefensive) > 40) {
    tips.push({ category: "positioning", priority: "high", message: "في عدم توازن بين هجومك ودفاعك. حاول تكون متوازن أكثر" });
  }

  if (p.avgSpeed < 1800 && (gameMode === "3v3" || gameMode === "2v2")) {
    tips.push({ category: "speed", priority: "high", message: "سرعة لعبتك بطيئة. حاول تتحرك أسرع وتستخدم boost عشان تكون أسرع في البلاي" });
  } else if (p.avgSpeed < 2000) {
    tips.push({ category: "speed", priority: "medium", message: "زود سرعة لعبتك شوي، سو fast rotation" });
  }

  if (p.percentSupersonic < 20) {
    tips.push({ category: "speed", priority: "medium", message: "قليل تستخدم speed supersonic. حاول توصل لهذي السرعة أكثر" });
  }

  if (p.timeSlowSpeed > 20) {
    tips.push({ category: "speed", priority: "low", message: "وقت كثير وانت بطيء. تقدر تتحرك أسرع" });
  }

  if (p.demosInflicted < 2 && (gameMode === "2v2" || gameMode === "3v3") && p.shots > 3) {
    tips.push({ category: "demos", priority: "low", message: "جرب تسوي demos أكثر، تفيد في فتح المساحة" });
  }

  if (p.demosTaken > p.demosInflicted * 2 && p.demosTaken > 3) {
    tips.push({ category: "demos", priority: "medium", message: "ينعدمونك! انتبه للي وراك وتعلم تتجنب demos" });
  }

  if (p.countPowerslide > 30) {
    tips.push({ category: "mechanics", priority: "medium", message: "تستخدم powerslide بكثرة. تعلم تسوي turns بدون powerslide" });
  } else if (p.countPowerslide < 5 && p.avgSpeed > 2000) {
    tips.push({ category: "mechanics", priority: "low", message: "استخدم powerslide عشان تقدر تلف أسرع" });
  }

  if (p.distBall > 5000) {
    tips.push({ category: "positioning", priority: "medium", message: "بعيد عن الكرة. حاول تكون أقرب عشان تقدر تلعب" });
  }

  if (p.timeBehindBall > p.timeInfrontBall && (p.timeBehindBall / (p.timeInfrontBall || 1)) > 2) {
    tips.push({ category: "rotation", priority: "high", message: "وقت كثير ورا الكرة. تعلم rotation وتقدم قدام" });
  }

  if (p.timeInfrontBall > p.timeBehindBall && (p.timeInfrontBall / (p.timeBehindBall || 1)) > 2) {
    tips.push({ category: "rotation", priority: "medium", message: "دايم قدام الكرة. راجع rotation وارجع للخلف إذا احتاج الوضع" });
  }

  if (p.goalsAgainstLastDefender > 2) {
    tips.push({ category: "defense", priority: "high", message: "يدخلون فيك goals وانت last defender. ركز على الدفاع وتعلم timing" });
  }

  if (p.saves < 1 && p.percentDefensive > 30) {
    tips.push({ category: "defense", priority: "medium", message: "ما سويت saves رغم وجودك الدفاعي. تعلم تقرأ البلاي" });
  }

  if (gameMode === "3v3") {
    tips.push({ category: "rotation", priority: "low", message: "في 3v3، rotation السريعة هي مفتاح الفوز. دورك ينتهي بعد التمريرة" });
  } else if (gameMode === "1v1") {
    tips.push({ category: "positioning", priority: "low", message: "في 1v1، الصبر أهم من السرعة. لا تنقض على كل كرة" });
  }

  if (p.goals >= 3) {
    tips.push({ category: "shooting", priority: "low", message: "تسديدك ممتاز! استمر على هذا المستوى" });
  }

  return tips;
}

export function generateAnalysisResult(players: any[], data: any): AnalysisResult {
  const bluePlayers = players.filter((p: any) => p.team === "blue");
  const orangePlayers = players.filter((p: any) => p.team === "orange");

  let gameMode = "3v3";
  const playlist = data.playlist_name || "";
  const lower = playlist.toLowerCase();
  if (lower.includes("duel")) gameMode = "1v1";
  else if (lower.includes("double")) gameMode = "2v2";
  else if (lower.includes("standard")) gameMode = "3v3";

  const blueName = data.blue?.name || `Blue (${bluePlayers.map((p: any) => p.name).join(", ")})`;
  const orangeName = data.orange?.name || `Orange (${orangePlayers.map((p: any) => p.name).join(", ")})`;

  return {
    gameMode,
    mapName: data.map_name || "Unknown",
    duration: data.duration || 0,
    overtime: data.overtime || false,
    playlist,
    blueName,
    orangeName,
    blueGoals: data.blue_goals ?? 0,
    orangeGoals: data.orange_goals ?? 0,
    players,
  };
}
