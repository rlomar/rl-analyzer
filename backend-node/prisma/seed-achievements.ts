import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const achievements = [
    { key: "first_replay", name: "البداية", description: "ارفع أول ريبلاي لك", icon: "upload" },
    { key: "ten_wins", name: "المنتصر", description: "اربح 10 مباريات", icon: "trophy" },
    { key: "aerial_master", name: "الطائر", description: "حقق أعلى وقت في الجو", icon: "cloud" },
    { key: "rotation_king", name: "المدور", description: "حقق أعلى وقت ورا الكرة", icon: "refresh_cw" },
    { key: "speed_demon", name: "البرق", description: "حقق أعلى متوسط سرعة", icon: "zap" },
    { key: "sharpshooter", name: "القناص", description: "حقق دقة تسديد 40%+", icon: "target" },
    { key: "boost_manager", name: "المهندس", description: "أفضل إدارة بوست", icon: "battery_charging" },
    { key: "demo_lord", name: "المدمّر", description: "سوي 5+ demos", icon: "bomb" },
    { key: "wall_warrior", name: "الحائطي", description: "سجل من أعلى الجدار", icon: "columns" },
    { key: "mvp", name: "الأفضل", description: "كن الأعلى score", icon: "award" },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { key: ach.key },
      update: {},
      create: ach,
    });
  }

  console.log(`Seeded ${achievements.length} achievements`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
