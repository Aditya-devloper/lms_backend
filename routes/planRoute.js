const router = require("express").Router();
const { getPlans } = require("../controllers/plans");

router.post("/getPlans", getPlans);

module.exports = router;
