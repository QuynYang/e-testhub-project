const mongoose = require("mongoose");
const Subject = require("../models/Subject");

exports.list = async (req, res, next) => {
  try {
    res.json(await Subject.find().lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await Subject.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code)
      return res.status(400).json({ message: "Missing name or code" });
    const created = await Subject.create({ name, code, description });
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
    const { name, code, description } = req.body;
    const updated = await Subject.findByIdAndUpdate(
      id,
      { name, code, description },
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
    const deleted = await Subject.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};
