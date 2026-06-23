/**
 * Quick utility to force-reset passwords for all seeded accounts.
 * Run with:  node --experimental-modules src/reset-passwords.js
 */
import { connectDb, disconnectDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { User } from "./models/User.js";

await connectDb();

const adminHash   = await hashPassword("Admin@123");
const teacherHash = await hashPassword("Teacher@123");

// Reset admin password
const adminResult = await User.updateOne(
  { email: "admin@spaceece.com" },
  { $set: { passwordHash: adminHash, status: "approved" } }
);
console.log("Admin reset:", adminResult.modifiedCount ? "✅ password updated" : "⚠️ not found or already current");

// Reset all teacher passwords
const teacherResult = await User.updateMany(
  { role: "teacher" },
  { $set: { passwordHash: teacherHash, status: "approved" } }
);
console.log("Teachers reset:", teacherResult.modifiedCount, "account(s) updated");

// List all accounts
const users = await User.find().select("email role status").lean();
console.log("\nAll accounts in database:");
users.forEach(u => console.log(`  ${u.role.padEnd(8)} | ${u.email.padEnd(35)} | status: ${u.status}`));

console.log("\n✅ Done! Login credentials:");
console.log("  Admin:   admin@spaceece.com / Admin@123");
console.log("  Teacher: <any teacher email> / Teacher@123");

await disconnectDb();
