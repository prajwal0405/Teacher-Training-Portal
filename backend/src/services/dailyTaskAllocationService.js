import ActivityBank from "../models/ActivityBank.js";
import AutomationTeacher from "../models/AutomationTeacher.js";
import DailyTaskAssignment from "../models/DailyTaskAssignment.js";
import TaskReplacementLog from "../models/TaskReplacementLog.js";
import { DEFAULT_LEVELS, getClassInfoByLevel, normalizeLevel } from "../config/classLevelConfig.js";
import { createDailyTaskNotification } from "./teacherNotificationService.js";

export const toDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
};

export const isWorkingDay = (value) => {
  const date = value ? new Date(value) : new Date();
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

const findAvailableTeacher = async (level, usedTeacherIds = []) => {
  const normalizedLevel = normalizeLevel(level);
  const baseQuery = {
    registeredStatus: "Registered",
    availabilityStatus: "Available",
    breakStatus: "No",
    teacherId: { $nin: usedTeacherIds }
  };

  const exactTeacher = await AutomationTeacher.findOne({ ...baseQuery, level: normalizedLevel })
    .sort({ currentActivitiesToday: 1, createdAt: 1 });
  if (exactTeacher) return exactTeacher;

  const preferredTeacher = await AutomationTeacher.findOne({ ...baseQuery, preferredLevel: normalizedLevel })
    .sort({ currentActivitiesToday: 1, createdAt: 1 });
  if (preferredTeacher) return preferredTeacher;

  return AutomationTeacher.findOne({ ...baseQuery, preferredLevel: "Any" })
    .sort({ currentActivitiesToday: 1, createdAt: 1 });
};

const selectActivitiesForLevel = async ({ level, activityCount }) => {
  const normalizedLevel = normalizeLevel(level);
  const previousAssignments = await DailyTaskAssignment.find({ level: normalizedLevel })
    .sort({ createdAt: -1 })
    .limit(20);

  const recentlyUsed = new Set(previousAssignments.flatMap((item) => item.tasks.map((task) => task.activityId)));
  const activities = await ActivityBank.find({ level: normalizedLevel, status: "Active" }).lean();

  const selected = [];
  const seenMilestones = new Set();
  const seenTypes = new Set();
  const freshActivities = activities.filter((item) => !recentlyUsed.has(item.activityId));
  const fallbackActivities = activities.filter((item) => recentlyUsed.has(item.activityId));
  const ordered = [...freshActivities, ...fallbackActivities];

  for (const activity of ordered) {
    if (selected.length >= activityCount) break;
    const milestoneKey = String(activity.milestone || "").toLowerCase();
    const typeKey = String(activity.type || activity.developmentalDomain || "").toLowerCase();

    if ((!seenMilestones.has(milestoneKey) && !seenTypes.has(typeKey)) || selected.length + 1 >= activityCount) {
      selected.push(activity);
      seenMilestones.add(milestoneKey);
      seenTypes.add(typeKey);
    }
  }

  if (selected.length < activityCount) {
    for (const activity of ordered) {
      if (selected.length >= activityCount) break;
      if (!selected.some((item) => item.activityId === activity.activityId)) {
        selected.push(activity);
      }
    }
  }

  return selected;
};

export const generateDailyTaskAssignments = async ({
  date,
  activityCount = 4,
  levels = DEFAULT_LEVELS,
  replaceExisting = false
} = {}) => {
  const dateKey = toDateKey(date);

  if (!isWorkingDay(dateKey)) {
    return {
      date: dateKey,
      workingDay: false,
      assignments: [],
      message: "Today is not a working day"
    };
  }

  if (replaceExisting) {
    await DailyTaskAssignment.deleteMany({ assignmentDate: dateKey });
  }

  const existingCount = await DailyTaskAssignment.countDocuments({ assignmentDate: dateKey });
  if (existingCount > 0 && !replaceExisting) {
    return {
      date: dateKey,
      workingDay: true,
      assignments: [],
      message: "Assignments already exist for today"
    };
  }

  await AutomationTeacher.updateMany({}, { $set: { currentActivitiesToday: 0 } });

  const assignments = [];
  const usedTeacherIds = [];

  for (const levelValue of levels) {
    const level = normalizeLevel(levelValue);
    const classInfo = getClassInfoByLevel(level);
    const teacher = await findAvailableTeacher(level, usedTeacherIds);

    if (!teacher) {
      assignments.push({ level, className: classInfo.className, status: "Skipped", reason: "No available teacher" });
      continue;
    }

    const activities = await selectActivitiesForLevel({ level, activityCount });
    if (activities.length === 0) {
      assignments.push({ level, className: classInfo.className, status: "Skipped", reason: "No activities found" });
      continue;
    }

    const assignment = await DailyTaskAssignment.create({
      assignmentDate: dateKey,
      teacher: teacher._id,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      className: classInfo.className,
      ageGroup: classInfo.ageGroup,
      level,
      activityCount: activities.length,
      tasks: activities.map((activity, index) => ({
        activity: activity._id,
        activityId: activity.activityId,
        activityName: activity.activityName,
        milestone: activity.milestone,
        type: activity.type || activity.developmentalDomain,
        status: "Pending",
        order: index + 1
      }))
    });

    await AutomationTeacher.updateOne({ _id: teacher._id }, { $set: { currentActivitiesToday: activities.length } });
    await createDailyTaskNotification(assignment);

    usedTeacherIds.push(teacher.teacherId);
    assignments.push(assignment);
  }

  return {
    date: dateKey,
    workingDay: true,
    assignments,
    message: "Daily assignments generated"
  };
};

export const updateTaskStatus = async ({ assignmentId, taskId, status }) => {
  const assignment = await DailyTaskAssignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const task = assignment.tasks.id(taskId);
  if (!task) throw new Error("Task not found");

  task.status = status;
  if (status === "Started") task.startedAt = new Date();
  if (status === "Completed") task.completedAt = new Date();

  const completed = assignment.tasks.filter((item) => item.status === "Completed").length;
  assignment.status = completed === assignment.tasks.length
    ? "Completed"
    : completed > 0
      ? "Partially Completed"
      : "Assigned";

  await assignment.save();
  return assignment;
};

export const reassignTeacherTasks = async ({ assignmentId, reason = "Teacher unavailable" }) => {
  const assignment = await DailyTaskAssignment.findById(assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const pendingTasks = assignment.tasks.filter((item) => item.status !== "Completed");
  const teacher = await findAvailableTeacher(assignment.level, [assignment.teacherId]);
  if (!teacher) throw new Error("No replacement teacher available");

  const oldTeacherId = assignment.teacherId;
  const oldTeacherName = assignment.teacherName;

  assignment.teacher = teacher._id;
  assignment.teacherId = teacher.teacherId;
  assignment.teacherName = teacher.name;
  assignment.status = "Reassigned";
  await assignment.save();

  await TaskReplacementLog.create({
    assignmentDate: assignment.assignmentDate,
    level: assignment.level,
    className: assignment.className,
    oldTeacherId,
    oldTeacherName,
    newTeacherId: teacher.teacherId,
    newTeacherName: teacher.name,
    reason,
    transferredTaskCount: pendingTasks.length,
    transferredTasks: pendingTasks.map((item) => item.activityId)
  });

  await createDailyTaskNotification(assignment);
  return assignment;
};

export default {
  generateDailyTaskAssignments,
  updateTaskStatus,
  reassignTeacherTasks,
  isWorkingDay,
  toDateKey
};