const mongoose = require("mongoose");
const ExamResult = require("../models/ExamResult");
const Exam = require("../models/Exam");
const User = require("../models/User");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeTotals = (payload = {}) => {
  const totalQuestions = Number(payload.totalQuestions ?? payload.total ?? 0);
  const correct = Number(payload.correct ?? payload.right ?? payload.correctCount ?? 0);
  const incorrect = Number(
    payload.incorrect ?? payload.wrong ?? payload.incorrectCount ?? payload.wrongCount ?? 0
  );
  const skipped = Number(payload.skipped ?? payload.skippedCount ?? payload.unanswered ?? 0);

  if (Number.isNaN(totalQuestions) || totalQuestions < 0) {
    throw new Error("Invalid totals.totalQuestions");
  }

  if (Number.isNaN(correct) || correct < 0) {
    throw new Error("Invalid totals.correct");
  }

  if (Number.isNaN(incorrect) || incorrect < 0) {
    throw new Error("Invalid totals.incorrect");
  }

  if (Number.isNaN(skipped) || skipped < 0) {
    throw new Error("Invalid totals.skipped");
  }

  if (totalQuestions < correct + incorrect + skipped) {
    throw new Error("Totals do not add up");
  }

  return {
    totalQuestions,
    correct,
    incorrect,
    skipped,
  };
};

const normalizeScore = (payload = {}) => {
  if (
    payload.earned === undefined &&
    payload.value === undefined &&
    payload.score === undefined
  ) {
    throw new Error("Missing score.earned");
  }

  if (payload.total === undefined && payload.max === undefined) {
    throw new Error("Missing score.total");
  }

  const earned = Number(payload.earned ?? payload.value ?? payload.score);
  const total = Number(payload.total ?? payload.max);
  let percentage =
    payload.percentage !== undefined
      ? Number(payload.percentage)
      : payload.percent !== undefined
      ? Number(payload.percent)
      : undefined;

  if (Number.isNaN(earned) || earned < 0) throw new Error("Invalid score.earned");
  if (Number.isNaN(total) || total <= 0) throw new Error("Invalid score.total");
  if (percentage !== undefined && (Number.isNaN(percentage) || percentage < 0 || percentage > 100)) {
    throw new Error("Invalid score.percentage");
  }

  if (percentage === undefined) {
    percentage = (earned / total) * 100;
  }

  return {
    earned,
    total,
    percentage,
  };
};

const normalizeAccuracy = (accuracy, totals) => {
  if (accuracy === undefined || accuracy === null) {
    if (totals.totalQuestions === 0) return 0;
    return (totals.correct / totals.totalQuestions) * 100;
  }
  const value = Number(accuracy);
  if (Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error("Invalid accuracy");
  }
  return value;
};

const normalizeQuestionResults = (payload = []) => {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(Boolean)
    .map((item) => {
      const questionNumber = Number(item.questionNumber ?? item.index ?? item.order);
      const isCorrect = item.isCorrect ?? item.correct;
      if (!Number.isFinite(questionNumber) || questionNumber < 1) {
        throw new Error("Invalid questionResults.questionNumber");
      }
      if (isCorrect === undefined) {
        throw new Error("Missing questionResults.isCorrect");
      }
      const record = {
        questionNumber,
        isCorrect: Boolean(isCorrect),
      };

      if (item.questionId && isValidObjectId(item.questionId)) {
        record.questionId = item.questionId;
      }
      if (item.selectedOption) record.selectedOption = item.selectedOption;
      if (item.correctOption) record.correctOption = item.correctOption;
      if (item.score !== undefined) {
        const scoreValue = Number(item.score);
        if (Number.isNaN(scoreValue) || scoreValue < 0) {
          throw new Error("Invalid questionResults.score");
        }
        record.score = scoreValue;
      }
      if (item.maxScore !== undefined) {
        const maxScoreValue = Number(item.maxScore);
        if (Number.isNaN(maxScoreValue) || maxScoreValue < 0) {
          throw new Error("Invalid questionResults.maxScore");
        }
        record.maxScore = maxScoreValue;
      }
      return record;
    })
    .sort((a, b) => a.questionNumber - b.questionNumber);
};

exports.list = async (req, res, next) => {
  try {
    const { examId, studentId } = req.query;
    const filter = {};
    if (examId) {
      if (!isValidObjectId(examId)) {
        return res.status(400).json({ message: "Invalid examId" });
      }
      filter.examId = examId;
    }
    if (studentId) {
      if (!isValidObjectId(studentId)) {
        return res.status(400).json({ message: "Invalid studentId" });
      }
      filter.studentId = studentId;
    }
    const results = await ExamResult.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json(results);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }
    const result = await ExamResult.findById(id).lean();
    if (!result) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getByStudentId = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ message: "Invalid studentId" });
    }
    const results = await ExamResult.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(results);
  } catch (error) {
    next(error);
  }
};

exports.getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const result = await ExamResult.findById(id).lean();
    if (!result) {
      return res.status(404).json({ message: "Not found" });
    }

    const [exam, student] = await Promise.all([
      result.examId ? Exam.findById(result.examId).lean() : null,
      result.studentId ? User.findById(result.studentId).lean() : null,
    ]);

    res.json({
      result,
      exam: exam
        ? {
            id: exam._id,
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            openAt: exam.openAt,
            closeAt: exam.closeAt,
            passingScore: exam.passingScore,
            totalQuestions: exam.questions?.length || exam.questionIds?.length || result.totals?.totalQuestions,
          }
        : null,
      student: student
        ? {
            id: student._id,
            fullName: student.fullName || `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim(),
            email: student.email,
            studentCode: student.studentCode,
          }
        : null,
      summary: {
        accuracy: result.accuracy,
        score: result.score,
        totals: result.totals,
        durationMinutes: result.durationMinutes,
        attemptNumber: result.attemptNumber,
        examDate: result.examDate,
        submittedAt: result.submittedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getByExamId = async (req, res, next) => {
  try {
    const { examId } = req.params;
    if (!isValidObjectId(examId)) {
      return res.status(400).json({ message: "Invalid examId" });
    }
    const results = await ExamResult.find({ examId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(results);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      studentId,
      examId,
      attemptNumber,
      examDate,
      submittedAt,
      durationMinutes,
      accuracy,
      score,
      totals,
      questionResults,
      notes,
    } = req.body;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: "Invalid or missing studentId" });
    }
    if (!examId || !isValidObjectId(examId)) {
      return res.status(400).json({ message: "Invalid or missing examId" });
    }
    if (!examDate || !submittedAt) {
      return res.status(400).json({ message: "Missing examDate or submittedAt" });
    }
    if (durationMinutes === undefined || durationMinutes === null) {
      return res.status(400).json({ message: "Missing durationMinutes" });
    }

    const duration = Number(durationMinutes);
    if (Number.isNaN(duration) || duration < 0) {
      return res.status(400).json({ message: "Invalid durationMinutes" });
    }

    const normalizedTotals = normalizeTotals(totals);
    const normalizedScore = normalizeScore(score);
    const normalizedAccuracy = normalizeAccuracy(accuracy, normalizedTotals);
    const normalizedQuestionResults = normalizeQuestionResults(questionResults);

    const payload = {
      studentId,
      examId,
      attemptNumber: attemptNumber ?? 1,
      examDate: new Date(examDate),
      submittedAt: new Date(submittedAt),
      durationMinutes: duration,
      accuracy: normalizedAccuracy,
      score: normalizedScore,
      totals: normalizedTotals,
      questionResults: normalizedQuestionResults,
    };

    if (notes) payload.notes = notes;

    const created = await ExamResult.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    if (error && error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Exam result already exists for this attempt" });
    }
    if (error && error.message) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

