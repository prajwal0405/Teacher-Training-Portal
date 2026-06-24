# MongoDB Collections

This backend uses MongoDB through Mongoose models in `backend/src/models`.

Main collections:

- `users`
- `centers`
- `classes`
- `children`
- `files`
- `courses`
- `lessonplans`
- `lessonplanassignments`
- `lessoncompletionreports`
- `childattendancesessions`
- `teacherattendancerecords`
- `activitysubmissions`
- `notifications`
- `reportjobs`

MongoDB does not need a SQL migration step. Start MongoDB, configure `MONGODB_URI`, then run:

```powershell
npm run db:seed
```
