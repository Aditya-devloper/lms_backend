const router = require("express").Router();
const { createCall } = require("../controllers/calle");

router.post("/call", createCall);

module.exports = router;
