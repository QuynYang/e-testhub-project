const mongoose = require("mongoose");
const ClassModel = require("../models/Class");
const User = require("../models/User");

exports.list = async (req, res, next) => {
  try {
    res.json(await ClassModel.find().populate("students").populate("questions").lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await ClassModel.findById(id)
      .populate("students")
      .populate("questions")
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      name,
      classCode,
      teacherId,
      students,
      courses,
      academicYear,
      courseId,
      questions,
    } = req.body;
    if (!name || !courseId || !classCode || !teacherId || !academicYear)
      return res.status(400).json({ message: "Missing required fields" });
    if (students && !Array.isArray(students)) {
      return res.status(400).json({
        message: "Students must be an array of user ids",
      });
    }

    if (Array.isArray(students)) {
      for (const studentId of students) {
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            message: "Invalid student id",
            error: `Student id ${studentId} không hợp lệ`,
          });
        }
      }
    }

    const created = await ClassModel.create({
      name,
      classCode,
      teacherId,
      students,
      courses,
      academicYear,
      courseId,
      questions,
    });

    if (Array.isArray(students) && students.length) {
      await User.updateMany(
        { _id: { $in: students } },
        {
          $addToSet: { classIds: created._id },
        }
      );
    }

    const populated = await ClassModel.findById(created._id)
      .populate("students")
      .populate("questions")
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const {
      name,
      classCode,
      teacherId,
      students,
      courses,
      academicYear,
      courseId,
      questions,
    } = req.body;

    const existing = await ClassModel.findById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (classCode !== undefined) updateData.classCode = classCode;
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (courses !== undefined) updateData.courses = courses;
    if (academicYear !== undefined) updateData.academicYear = academicYear;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (questions !== undefined) updateData.questions = questions;

    let newStudentsList;
    if (students !== undefined) {
      if (!Array.isArray(students)) {
        return res.status(400).json({
          message: "Students must be an array of user ids",
        });
      }
      for (const studentId of students) {
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          return res.status(400).json({
            message: "Invalid student id",
            error: `Student id ${studentId} không hợp lệ`,
          });
        }
      }
      updateData.students = students;
      newStudentsList = students.map((id) => id.toString());
    }

    const updated = await ClassModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("students")
      .populate("questions")
      .lean();

    if (!updated) return res.status(404).json({ message: "Not found" });

    if (newStudentsList) {
      const prevStudents = (existing.students || []).map((sid) => sid.toString());
      const prevSet = new Set(prevStudents);
      const newSet = new Set(newStudentsList);

      const toAdd = [...newSet].filter((sid) => !prevSet.has(sid));
      const toRemove = [...prevSet].filter((sid) => !newSet.has(sid));

      if (toAdd.length) {
        await User.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { classIds: existing._id } }
        );
      }

      if (toRemove.length) {
        await User.updateMany(
          { _id: { $in: toRemove } },
          { $pull: { classIds: existing._id } }
        );
      }
    }

    res.json(updated);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const deleted = await ClassModel.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    if (deleted.students && deleted.students.length) {
      await User.updateMany(
        { _id: { $in: deleted.students } },
        { $pull: { classIds: deleted._id } }
      );
    }
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};
