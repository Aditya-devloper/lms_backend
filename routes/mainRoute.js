const router = require("express").Router();

const user = require("./userRoute");
const lead = require("./leadRoute");
const business = require("./businessRoute");
const dashboard = require("./dashboard");

router.use("/user", user);
router.use("/lead", lead);
router.use("/business", business);
router.use("/dashboard", dashboard);

module.exports = router;
