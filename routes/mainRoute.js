const router = require("express").Router();

const user = require("./userRoute");
const lead = require("./leadRoute");
const business = require("./businessRoute");
const dashboard = require("./dashboard");
const agent = require("./agentRoute");
const subscription = require("./subscriptionRoute");

router.use("/user", user);
router.use("/lead", lead);
router.use("/business", business);
router.use("/dashboard", dashboard);
router.use("/agent", agent);
router.use("/subscription", subscription);

module.exports = router;
