const router = require("express").Router();
const passport = require("passport");
const { getDashboardData } = require("../controllers/dashboard");

router.post(
  "/getDashboardData",
  passport.authenticate("jwt", { session: false }),
  getDashboardData,
);

module.exports = router;
