import type { AnalyzedPlayer } from "./analyzer";

interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_replay", name: "البداية", description: "ارفع أول ريبلاي لك", icon: "upload", condition: "first_replay" },
  { key: "ten_wins", name: "المنتصر", description: "اربح 10 مباريات", icon: "trophy", condition: "ten_wins" },
  { key: "aerial_master", name: "الطائر", description: "حقق more aerial time than all players", icon: "cloud", condition: "air_pct_high" },
  { key: "rotation_king", name: "المدور", description: "حقق time behind ball أكثر من الجميع", icon: "refresh_cw", condition: "rotation_high" },
  { key: "speed_demon", name: "البرق", description: "حقق أعلى متوسط سرعة", icon: "zap", condition: "speed_highest" },
  { key: "sharpshooter", name: "القناص", description: "حقق دقة تسديد 40%+", icon: "target", condition: "shooting_40" },
  { key: "boost_manager", name: "المهندس", description: "حقق أقل boost wasted", icon: "battery_charging", condition: "boost_efficient" },
  { key: "demo_lord", name: "المدمّر", description: "سوي 5+ demos", icon: "bomb", condition: "demo_5" },
  { key: "wall_warrior", name: "الحائطي", description: "سجل من أعلى الجدار", icon: "columns", condition: "wall_shot" },
  { key: "mvp", name: "الأفضل", description: "كن الأعلى score في المباراة", icon: "award", condition: "highest_score" },
];

export function getAchievementDefs(): AchievementDef[] {
  return ACHIEVEMENTS;
}

export function checkAchievements(
  players: AnalyzedPlayer[],
  userPlayerName: string,
  existingUnlocked: string[],
): string[] {
  const userPlayer = players.find((p) => p.playerName === userPlayerName);
  if (!userPlayer) return [];

  const newlyUnlocked: string[] = [];
  const allPlayerNames = players.map((p) => p.playerName);
  const unlockedSet = new Set(existingUnlocked);

  for (const ach of ACHIEVEMENTS) {
    if (unlockedSet.has(ach.key)) continue;

    switch (ach.condition) {
      case "first_replay":
        if (!unlockedSet.has("first_replay")) newlyUnlocked.push(ach.key);
        break;
      case "air_pct_high": {
        const maxAir = Math.max(...players.map((p) => p.airPct || 0));
        if (userPlayer.airPct >= maxAir && userPlayer.airPct > 10) newlyUnlocked.push(ach.key);
        break;
      }
      case "rotation_high": {
        const maxBehind = Math.max(...players.map((p) => p.timeBehindBall || 0));
        if (userPlayer.timeBehindBall >= maxBehind && userPlayer.timeBehindBall > 30) newlyUnlocked.push(ach.key);
        break;
      }
      case "speed_highest": {
        const maxSpeed = Math.max(...players.map((p) => p.avgSpeed || 0));
        if (userPlayer.avgSpeed >= maxSpeed) newlyUnlocked.push(ach.key);
        break;
      }
      case "shooting_40":
        if (userPlayer.shootingPct >= 40 && userPlayer.shots >= 3) newlyUnlocked.push(ach.key);
        break;
      case "boost_efficient": {
        const minWasted = Math.min(...players.map((p) => p.boostWastedPct || Infinity));
        if (userPlayer.boostWastedPct <= minWasted && userPlayer.boostWastedPct < 20) newlyUnlocked.push(ach.key);
        break;
      }
      case "demo_5":
        if (userPlayer.demosInflicted >= 5) newlyUnlocked.push(ach.key);
        break;
      case "highest_score": {
        const maxScore = Math.max(...players.map((p) => p.score || 0));
        if (userPlayer.score >= maxScore && userPlayer.score > 0) newlyUnlocked.push(ach.key);
        break;
      }
    }
  }

  return newlyUnlocked;
}
