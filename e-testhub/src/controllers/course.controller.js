const mongoose = require("mongoose");
const Course = require("../models/Course");
const Class = require("../models/Class");

exports.list = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .populate("classes")
      .lean();
    res.json(courses);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await Course.findById(id).populate("classes").lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { courseCode, courseName, startYear, endYear, classes } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!courseCode || !courseName || startYear == null || endYear == null) {
      return res.status(400).json({
        message: "Thiếu các trường bắt buộc",
        error: "Vui lòng điền đầy đủ: courseCode, courseName, startYear, endYear",
      });
    }

    // Kiểm tra courseCode đã tồn tại chưa
    const exists = await Course.findOne({ courseCode });
    if (exists) {
      return res.status(409).json({
        message: "Mã khóa học đã tồn tại",
        error: "courseCode này đã được sử dụng. Vui lòng chọn mã khác",
      });
    }

    // Kiểm tra startYear < endYear
    if (startYear >= endYear) {
      return res.status(400).json({
        message: "Năm bắt đầu phải nhỏ hơn năm kết thúc",
        error: "startYear phải nhỏ hơn endYear",
      });
    }

    // Kiểm tra classes nếu có
    if (classes && Array.isArray(classes)) {
      for (const classId of classes) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          return res.status(400).json({
            message: "ID lớp học không hợp lệ",
            error: `Class ID ${classId} không hợp lệ`,
          });
        }
        const classExists = await Class.findById(classId);
        if (!classExists) {
          return res.status(404).json({
            message: "Lớp học không tồn tại",
            error: `Không tìm thấy lớp học với ID ${classId}`,
          });
        }
      }
    }

    const created = await Course.create({
      courseCode,
      courseName,
      startYear,
      endYear,
      classes: classes || [],
    });

    // Populate classes trong response
    const populated = await Course.findById(created._id)
      .populate("classes")
      .lean();

    res.status(201).json(populated);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({
        message: "Mã khóa học đã tồn tại",
        error: "courseCode này đã được sử dụng",
      });
    }
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });

    const { courseCode, courseName, startYear, endYear, classes } = req.body;

    // Kiểm tra startYear < endYear nếu cả hai đều được cung cấp
    if (startYear != null && endYear != null && startYear >= endYear) {
      return res.status(400).json({
        message: "Năm bắt đầu phải nhỏ hơn năm kết thúc",
        error: "startYear phải nhỏ hơn endYear",
      });
    }

    // Kiểm tra courseCode đã tồn tại chưa (nếu có thay đổi)
    if (courseCode) {
      const exists = await Course.findOne({
        courseCode,
        _id: { $ne: id },
      });
      if (exists) {
        return res.status(409).json({
          message: "Mã khóa học đã tồn tại",
          error: "courseCode này đã được sử dụng. Vui lòng chọn mã khác",
        });
      }
    }

    // Kiểm tra classes nếu có
    if (classes && Array.isArray(classes)) {
      for (const classId of classes) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          return res.status(400).json({
            message: "ID lớp học không hợp lệ",
            error: `Class ID ${classId} không hợp lệ`,
          });
        }
        const classExists = await Class.findById(classId);
        if (!classExists) {
          return res.status(404).json({
            message: "Lớp học không tồn tại",
            error: `Không tìm thấy lớp học với ID ${classId}`,
          });
        }
      }
    }

    const updateData = {};
    if (courseCode !== undefined) updateData.courseCode = courseCode;
    if (courseName !== undefined) updateData.courseName = courseName;
    if (startYear !== undefined) updateData.startYear = startYear;
    if (endYear !== undefined) updateData.endYear = endYear;
    if (classes !== undefined) updateData.classes = classes;

    const updated = await Course.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("classes")
      .lean();

    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({
        message: "Mã khóa học đã tồn tại",
        error: "courseCode này đã được sử dụng",
      });
    }
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const deleted = await Course.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};
