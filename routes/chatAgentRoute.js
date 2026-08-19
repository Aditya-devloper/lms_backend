const router = require("express").Router();

const {
  sendMessage,
  getConversationHistory,
} = require("../controllers/chatAgent");

router.post("/sendMessage", sendMessage);
router.post("/getConversationHistory", getConversationHistory);

module.exports = router;
