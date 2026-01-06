const router = require("express").Router();
const { authenticate } = require("../middlewares/auth");
const c = require("../controllers/subject.controller");

router.use(authenticate);

router.get("/", c.list);
router.get("/:id", c.getById);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
