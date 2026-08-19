const router = require("express").Router();

const {
  triggerCallAgent,
  getCallHistory,
  getCallStats,
} = require("../controllers/callAgent");

const { authMiddleware } = require("../middleware/auth");

router.post("/trigger-call", authMiddleware, triggerCallAgent);
router.post("/getCallHistory", authMiddleware, getCallHistory);
router.post("/getCallStats", authMiddleware, getCallStats);

module.exports = router;
