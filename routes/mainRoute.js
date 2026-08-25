const router = require("express").Router();

const user = require("./userRoute");
const lead = require("./leadRoute");
const business = require("./businessRoute");
const dashboard = require("./dashboard");
const callAgent = require("./callAgentRoute");
const rag = require("./ragRoute");
const subscription = require("./subscriptionRoute");
const chatAgent = require("./chatAgentRoute");
const userAgent = require("./userAgentRoute");
const plan = require("./planRoute");

router.use("/user", user);
router.use("/lead", lead);
router.use("/business", business);
router.use("/dashboard", dashboard);
router.use("/call-agent", callAgent);
router.use("/rag", rag);
router.use("/subscription", subscription);
router.use("/chat-agent", chatAgent);
router.use("/human-agent", userAgent);
router.use("/plan", plan);

module.exports = router;
