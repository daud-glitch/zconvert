const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@transmute.com" },
    update: { role: "admin", passwordHash: "Admin@123!" },
    create: { email: "admin@transmute.com", name: "Admin", role: "admin", passwordHash: "Admin@123!" }
  });
  console.log("Admin created:", admin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
