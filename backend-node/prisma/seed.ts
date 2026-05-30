import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const coachPassword = await bcrypt.hash("coach123", 12);
  const userPassword = await bcrypt.hash("user123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@rlcoach.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@rlcoach.com",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("Admin created:", admin.email);

  const coach1 = await prisma.user.upsert({
    where: { email: "coach1@rlcoach.com" },
    update: {},
    create: {
      name: "Ahmed Coach",
      email: "coach1@rlcoach.com",
      password: coachPassword,
      role: "coach",
    },
  });
  console.log("Coach created:", coach1.email);

  const coach2 = await prisma.user.upsert({
    where: { email: "coach2@rlcoach.com" },
    update: {},
    create: {
      name: "Sara Coach",
      email: "coach2@rlcoach.com",
      password: coachPassword,
      role: "coach",
    },
  });
  console.log("Coach created:", coach2.email);

  const user1 = await prisma.user.upsert({
    where: { email: "user1@rlcoach.com" },
    update: {},
    create: {
      name: "Omar Player",
      email: "user1@rlcoach.com",
      password: userPassword,
      role: "user",
    },
  });
  console.log("User created:", user1.email);

  const user2 = await prisma.user.upsert({
    where: { email: "user2@rlcoach.com" },
    update: {},
    create: {
      name: "Khalid Player",
      email: "user2@rlcoach.com",
      password: userPassword,
      role: "user",
    },
  });
  console.log("User created:", user2.email);

  await prisma.coachingRequest.createMany({
    data: [
      {
        userId: user1.id,
        rank: "Platinum 2",
        problemType: "Rotation",
        description: "I keep getting caught out of position in 2v2. Need help with rotation and when to challenge.",
        status: "pending",
      },
      {
        userId: user1.id,
        rank: "Platinum 2",
        problemType: "Aerials",
        description: "Struggling with aerial consistency. Can't seem to read the ball off the wall.",
        status: "accepted",
        coachId: coach1.id,
      },
      {
        userId: user2.id,
        rank: "Diamond 1",
        problemType: "Mechanics",
        description: "Need help with flip resets and air dribbles. Can do basic ones but inconsistent.",
        status: "completed",
        coachId: coach1.id,
        coachNotes: "Focus on car control in free play first. Practice air roll left/right separately before combining.",
      },
      {
        userId: user2.id,
        rank: "Gold 3",
        problemType: "Defense",
        description: "Getting scored on from basic shots. Need help with positioning and saves.",
        status: "rejected",
      },
    ],
  });
  console.log("Sample requests created");

  console.log("\nSeed completed!");
  console.log("--- Test credentials ---");
  console.log("Admin:  admin@rlcoach.com / admin123");
  console.log("Coach:  coach1@rlcoach.com / coach123");
  console.log("Coach:  coach2@rlcoach.com / coach123");
  console.log("User:   user1@rlcoach.com / user123");
  console.log("User:   user2@rlcoach.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
