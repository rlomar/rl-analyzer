import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding admin account...");

  const adminPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@rlcoach.com" },
    update: { name: "Admin", role: "admin" },
    create: {
      name: "Admin",
      email: "admin@rlcoach.com",
      password: adminPassword,
      role: "admin",
    },
  });
  console.log("Admin created: admin@rlcoach.com");

  console.log("\nAdmin credentials: admin@rlcoach.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
