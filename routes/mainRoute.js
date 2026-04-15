const router = require("express").Router();

const user = require("./userRoute");
const lead = require("./leadRoute");
const business = require("./businessRoute");

router.use("/user", user);
router.use("/lead", lead);
router.use("/business", business);

module.exports = router;
