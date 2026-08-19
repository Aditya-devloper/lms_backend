const Message = require("../../models/messageModel");
const Conversation = require("../../models/conversationModel");

const saveMessage = async (state) => {
  console.log("saveMessage node comes");

  await Message.create([
    {
      conversation: state.conversationId,
      role: "user",
      content: state.userMessage,
    },
    {
      conversation: state.conversationId,
      role: "assistant",
      content: state.aiResponse,
    },
  ]);

  await Conversation.findByIdAndUpdate(state.conversationId, {
    last_active_at: new Date(),
  });

  return {};
};

module.exports = { saveMessage };
