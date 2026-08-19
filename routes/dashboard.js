const router = require("express").Router();
const { getDashboardData } = require("../controllers/dashboard");
const { authMiddleware } = require("../middleware/auth");

router.post("/getDashboardData", authMiddleware, getDashboardData);

module.exports = router;
