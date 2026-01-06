const mongoose = require("mongoose");

const { Schema } = mongoose;

const questionResultSchema = new Schema(
  {
    questionNumber: { type: Number, required: true, min: 1 },
    questionId: { type: Schema.Types.ObjectId, ref: "Question" },
    selectedOption: { type: String, trim: true },
    correctOption: { type: String, trim: true },
    isCorrect: { type: Boolean, required: true },
    score: { type: Number, min: 0 },
    maxScore: { type: Number, min: 0 },
  },
  { _id: false }
);

const examResultSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    attemptNumber: { type: Number, default: 1, min: 1 },
    examDate: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 0 },
    accuracy: { type: Number, min: 0, max: 100 },
    score: {
      earned: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
      percentage: { type: Number, min: 0, max: 100 },
    },
    totals: {
      totalQuestions: { type: Number, required: true, min: 0 },
      correct: { type: Number, required: true, min: 0 },
      incorrect: { type: Number, default: 0, min: 0 },
      skipped: { type: Number, default: 0, min: 0 },
    },
    questionResults: [questionResultSchema],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

examResultSchema.index(
  { examId: 1, studentId: 1, attemptNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExamResult", examResultSchema);

