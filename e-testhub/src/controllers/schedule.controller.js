const mongoose = require("mongoose");
const ExamSchedule = require("../models/ExamSchedule");

exports.list = async (req, res, next) => {
  try {
    res.json(await ExamSchedule.find().lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await ExamSchedule.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { examId, classId, startTime, endTime, isClosed } = req.body;
    if (!examId || !classId || !startTime || !endTime)
      return res.status(400).json({ message: "Missing fields" });
    if (new Date(endTime) <= new Date(startTime))
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });
    const created = await ExamSchedule.create({
      examId,
      classId,
      startTime,
      endTime,
      isClosed,
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const { examId, classId, startTime, endTime, isClosed } = req.body;
    if (startTime && endTime && new Date(endTime) <= new Date(startTime))
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });
    const updated = await ExamSchedule.findByIdAndUpdate(
      id,
      { examId, classId, startTime, endTime, isClosed },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
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
    const deleted = await ExamSchedule.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};
