const router = require("express").Router();
const { authenticate } = require("../middlewares/auth");
const c = require("../controllers/auditLog.controller");

router.use(authenticate);

router.get("/", c.list);
router.get("/:id", c.getById);

module.exports = router;

