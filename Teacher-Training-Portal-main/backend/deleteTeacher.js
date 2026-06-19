import mongoose from "mongoose";
import Teacher from "./models/Teacher.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB at:", process.env.MONGODB_URI);
    const res = await Teacher.deleteOne({ email: "sannidhya@spacece.com" });
    console.log("Successfully deleted default teacher. Deleted count:", res.deletedCount);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error deleting teacher:", err);
    process.exit(1);
  }
}
run();
