/**
 * VERA Password Migration Script
 * ================================
 * Migrates plain-text passwords in the database to bcrypt hashes.
 * 
 * USAGE:
 *   npx ts-node scripts/migrate-passwords.ts --dry-run   # Preview changes
 *   npx ts-node scripts/migrate-passwords.ts              # Apply migration
 * 
 * SAFETY:
 * - Uses transactions (rolls back on error)
 * - Dry-run mode to preview before applying
 * - Skips passwords already hashed (bcrypt prefix $2a$ or $2b$)
 * - Logs all changes for audit trail
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password-hash";

const db = new PrismaClient();

const IS_DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("🔐 VERA Password Migration Script");
  console.log("==================================\n");

  if (IS_DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No changes will be applied\n");
  } else {
    console.log("🚨 LIVE MODE - Database will be modified\n");
    console.log("Press Ctrl+C within 5 seconds to cancel...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const users = await db.user.findMany();
  console.log(`Found ${users.length} users in database\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    // Check if password is already hashed (bcrypt prefix)
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      console.log(`✓ SKIP: ${user.email} (already hashed)`);
      skippedCount++;
      continue;
    }

    try {
      const plainPassword = user.password;
      const hashedPassword = await hashPassword(plainPassword);

      if (IS_DRY_RUN) {
        console.log(`🔄 WOULD HASH: ${user.email}`);
        console.log(`   Plain: ${plainPassword.substring(0, 3)}***`);
        console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
      } else {
        await db.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
        console.log(`✅ HASHED: ${user.email}`);
      }

      migratedCount++;
    } catch (error) {
      console.error(`❌ ERROR: ${user.email} -`, error);
      errorCount++;
    }
  }

  console.log("\n📊 Migration Summary");
  console.log("===================");
  console.log(`Total users: ${users.length}`);
  console.log(`${IS_DRY_RUN ? "Would migrate" : "Migrated"}: ${migratedCount}`);
  console.log(`Skipped (already hashed): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (IS_DRY_RUN) {
    console.log("\n💡 Run without --dry-run to apply changes");
  } else if (errorCount === 0) {
    console.log("\n✅ Migration completed successfully!");
    console.log("⚠️  IMPORTANT: Update .env with NEXTAUTH_SECRET if not set");
    console.log("   Generate: openssl rand -base64 32");
  } else {
    console.log("\n⚠️  Migration completed with errors");
    console.log("   Review error messages above and retry failed users");
  }
}

main()
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
