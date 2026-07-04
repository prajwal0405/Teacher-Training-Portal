import cron from "node-cron";
import { generateDailyTaskAssignments } from "../services/dailyTaskAllocationService.js";

export const startDailyTaskAutomationCron = () => {
  const schedule = process.env.DAILY_TASK_CRON || "30 7 * * 1-5";

  cron.schedule(schedule, async () => {
    try {
      await generateDailyTaskAssignments({
        activityCount: Number(process.env.DAILY_ACTIVITY_COUNT || 4),
        replaceExisting: false
      });
      console.log("Daily task automation completed.");
    } catch (error) {
      console.error("Daily task automation failed:", error.message);
    }
  });

  console.log(`Daily task automation cron scheduled: ${schedule}`);
};

export default startDailyTaskAutomationCron;
