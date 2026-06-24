import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ["video", "pdf", "document", "slide", "audio", "link"], required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "FileAsset" },
    externalUrl: String,
    description: String,
    detailedLearningContent: String,
    practicalExamples: [String],
    suggestedDuration: String,
    durationMinutes: Number,
    videoTitle: String,
    notes: String,
    order: { type: Number, default: 1 },
    isRequired: { type: Boolean, default: true },
  },
  { _id: true, timestamps: true }
);

const mcqSchema = new mongoose.Schema(
  {
    question: String,
    options: [String],
    answer: String,
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    mcqs: [mcqSchema],
    practicalAssignments: [String],
    reflectionActivities: [String],
  },
  { _id: false }
);

const studyMaterialSchema = new mongoose.Schema(
  {
    moduleNotes: mongoose.Schema.Types.Mixed,
    summaryNotes: String,
    revisionPoints: [String],
    importantConcepts: [String],
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    description: String,
    learningOutcomes: [String],
    detailedNotes: String,
    keyTakeaways: [String],
    assessments: assessmentSchema,
    studyMaterials: studyMaterialSchema,
    contents: [contentSchema],
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    objectives: String,
    learningObjectives: [String],
    targetAudience: [String],
    prerequisites: [String],
    skillsCovered: [String],
    tags: String,
    category: String,
    level: String,
    topic: String,
    duration: String,
    durationText: String,
    contentType: { type: String, enum: ["Video", "PDF", "Document"], default: "Video" },
    contentLink: String,
    youtubeId: String,
    assessments: assessmentSchema,
    studyMaterials: studyMaterialSchema,
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    modules: [moduleSchema],
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
