const express = require("express");
const controller = require("../controllers/examResult.controller");

const router = express.Router();

router.get("/", controller.list);
router.get("/student/:studentId", controller.getByStudentId);
router.get("/exam/:examId", controller.getByExamId);
router.get("/:id/detail", controller.getDetail);
router.get("/:id", controller.getById);
router.post("/", controller.create);

module.exports = router;

