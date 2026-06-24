import dotenv from "dotenv";
dotenv.config({ path: "./.env", override: true });
import { generateAICourse } from "./services/aiCourseGenerator.js";

async function test() {
  try {
    const course = await generateAICourse({
      topic: "Introduction to Phonics",
      duration: "4 Weeks",
      numModules: 2,
    });
    console.log("Success! Generated course title:", course.title);
    console.log("Modules count:", course.modules?.length);
  } catch (error) {
    console.error("Error caught in test:");
    console.error("Message:", error.message);
    console.error("Status:", error.status);
    console.error("Stack:", error.stack);
  }
}
test();
