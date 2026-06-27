import { connectDb, disconnectDb } from "./db.js";
import { hashPassword } from "./auth.js";
import { User } from "./models/User.js";

async function createAdmin() {
  await connectDb();

  const adminEmail = "admin@spaceece.com";
  const password = "Admin@123";
  const passwordHash = await hashPassword(password);

  console.log(`Checking if admin user ${adminEmail} exists...`);
  
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (existingAdmin) {
    console.log("Admin account already exists in the database.");
  } else {
    await User.create({
      role: "admin",
      name: "System Administrator",
      email: adminEmail,
      phone: "9999999999",
      passwordHash: passwordHash,
      status: "approved",
    });
    console.log("-----------------------------------------");
    console.log("Initial Admin Account Created Successfully!");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${password}`);
    console.log("-----------------------------------------");
  }

  await disconnectDb();
}

createAdmin().catch((err) => {
  console.error("Error creating admin user:", err);
  process.exit(1);
});
