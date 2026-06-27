import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import path from "path";
import { fileURLToPath } from "url";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not override DNS servers:", e.message);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

export async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/teacher_training_portal";

  if (mongoUri.includes("<db_password>")) {
    throw new Error("Replace <db_password> in backend/.env MONGODB_URI with your real MongoDB Atlas database password.");
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.warn(`Primary database connection failed: ${error.message}`);
    const localUri = "mongodb://127.0.0.1:27017/teacher_training_portal";
    if (mongoUri !== localUri) {
      console.log(`Falling back to local database: ${localUri}`);
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected (local fallback): ${mongoose.connection.name}`);
    } else {
      throw error;
    }
  }
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
