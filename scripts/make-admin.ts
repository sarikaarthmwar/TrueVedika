import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

const [updated] = await db.update(users).set({ role: "admin" }).where(eq(users.email, email)).returning();
if (!updated) {
  console.error(`No user found with email ${email}. Make sure they've signed up first at /auth.`);
  process.exit(1);
}
console.log(`Done: ${updated.email} is now an admin.`);
process.exit(0);
