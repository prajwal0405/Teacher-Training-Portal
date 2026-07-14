import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AutomationTeacher from "../models/AutomationTeacher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const seedDummyTeachers = async () => {
  const filePath = path.join(__dirname, "../data/dummy_teachers.json");
  const dummyTeachers = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  await AutomationTeacher.deleteMany({});
  const inserted = await AutomationTeacher.insertMany(dummyTeachers);
  return { inserted: inserted.length };
};

export default seedDummyTeachers;
