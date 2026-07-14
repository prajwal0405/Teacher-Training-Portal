import xlsx from "xlsx";
import crypto from "crypto";
import ActivityBank from "../models/ActivityBank.js";
import { normalizeLevel, getClassInfoByLevel } from "../config/classLevelConfig.js";

const cleanText = (value) => String(value || "").trim().replace(/\s+/g, " ");

const getValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
};

export const importActivitiesFromExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  const importBatchId = crypto.randomUUID();

  const activities = rows.map((row, index) => {
    const level = normalizeLevel(getValue(row, ["Level", "level"]));
    const classInfo = getClassInfoByLevel(level);
    const sourceRowNumber = Number(getValue(row, ["No.", "No", "Sr No", "Sr. No"]) || index + 1);

    return {
      activityId: `ACT-${level.replace(/\s+/g, "")}-${String(index + 1).padStart(4, "0")}`,
      sourceRowNumber,
      milestone: cleanText(getValue(row, ["Milestone", "milestone"])),
      activityName: cleanText(getValue(row, ["Activity Name", "Activity", "Activity 2"])),
      duration: cleanText(getValue(row, ["Duration", "duration"])),
      materialsRequired: cleanText(getValue(row, ["Materials Required", "Materials", "Material"])),
      developmentalDomain: cleanText(getValue(row, ["Developmental Domain", "Domain", "Type"])),
      purposeOfActivity: cleanText(getValue(row, ["Purpose of Activity", "Purpose", "Purpose / Expected Learning Outcome"])),
      howToConduct: cleanText(getValue(row, ["How to Conduct (Detailed)", "How to Conduct", "Conduct"])),
      facilitatorRole: cleanText(getValue(row, ["Facilitator's Role", "Facilitator Role"])),
      expectedLearningOutcomes: cleanText(getValue(row, ["Expected Learning Outcomes", "Expected Outcome", "Expected Outcomes"])),
      level,
      type: cleanText(getValue(row, ["Type", "Developmental Domain", "Domain"])),
      className: classInfo.className,
      ageGroup: classInfo.ageGroup,
      status: "Active",
      importBatchId
    };
  }).filter((activity) => activity.level && activity.activityName);

  await ActivityBank.deleteMany({});
  if (activities.length) {
    await ActivityBank.insertMany(activities, { ordered: false });
  }

  const summary = await ActivityBank.aggregate([
    { $group: { _id: { className: "$className", level: "$level", type: "$type" }, count: { $sum: 1 } } },
    { $sort: { "_id.className": 1, "_id.level": 1, "_id.type": 1 } }
  ]);

  return {
    imported: activities.length,
    importBatchId,
    sheetName,
    summary
  };
};

export default importActivitiesFromExcel;
