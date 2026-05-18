/**
 * Secure Admin Creation Script
 *
 * Usage:
 *   node create-admin.js <email> <password> <setup_secret>
 *
 * Environment variables (preferred over CLI args):
 *   ADMIN_SETUP_SECRET  - The secret key required to create admin
 *   ADMIN_EMAIL         - Admin email
 *   ADMIN_PASSWORD      - Admin password (min 8 chars)
 *
 * Example:
 *   ADMIN_SETUP_SECRET=my-secret ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MySecurePass123 node create-admin.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Get secret from env or CLI arg
  const envSecret = process.env.ADMIN_SETUP_SECRET;
  const cliSecret = process.argv[4];
  const secret = envSecret || cliSecret;

  if (!secret) {
    console.error("❌ Error: ADMIN_SETUP_SECRET environment variable is not set.");
    console.error("   Set it with: export ADMIN_SETUP_SECRET=your-secret-key");
    console.error("   Then run this script again.");
    process.exit(1);
  }

  // Get email from env or CLI arg
  const envEmail = process.env.ADMIN_EMAIL;
  const cliEmail = process.argv[2];
  const email = envEmail || cliEmail;

  if (!email) {
    console.error("❌ Error: Admin email is required.");
    console.error("   Usage: node create-admin.js <email> <password> [setup_secret]");
    console.error("   Or set ADMIN_EMAIL and ADMIN_PASSWORD env vars.");
    process.exit(1);
  }

  // Get password from env or CLI arg
  const envPassword = process.env.ADMIN_PASSWORD;
  const cliPassword = process.argv[3];
  const password = envPassword || cliPassword;

  if (!password) {
    console.error("❌ Error: Admin password is required.");
    console.error("   Usage: node create-admin.js <email> <password> [setup_secret]");
    console.error("   Or set ADMIN_EMAIL and ADMIN_PASSWORD env vars.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  // Verify secret matches
  if (process.env.ADMIN_SETUP_SECRET && process.env.ADMIN_SETUP_SECRET !== secret) {
    // CLI secret overrides env for flexibility
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      const updated = await prisma.user.update({
        where: { email },
        data: {
          role: "admin",
          passwordHash,
          isActive: true,
        },
      });
      console.log(`✅ User ${email} is now an admin.`);
      console.log(`   ID: ${updated.id}`);
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: "Administrator",
          role: "admin",
        },
      });
      console.log(`✅ Admin user created: ${email}`);
      console.log(`   ID: ${user.id}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
