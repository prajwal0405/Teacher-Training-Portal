import TeacherNotification from "../models/TeacherNotification.js";

export const createDailyTaskNotification = async (assignment) => {
  const title = "Today’s preschool activity tasks are ready";
  const message = `Good morning ${assignment.teacherName}. Your class for today is ${assignment.className} ${assignment.level}. You have ${assignment.activityCount} activities assigned in your dashboard.`;

  return TeacherNotification.create({
    teacher: assignment.teacher,
    teacherId: assignment.teacherId,
    title,
    message,
    notificationDate: assignment.assignmentDate,
    type: "Daily Task",
    visibleFrom: new Date(),
    relatedAssignment: assignment._id
  });
};

export const getTeacherNotifications = async (teacherId) => {
  return TeacherNotification.find({ teacherId }).sort({ createdAt: -1 }).limit(50);
};

export default {
  createDailyTaskNotification,
  getTeacherNotifications
};
