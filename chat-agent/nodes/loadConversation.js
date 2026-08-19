const Conversation = require("../../models/conversationModel");
const Message = require("../../models/messageModel");

const HISTORY_LIMIT = 10; // last 10 messages

const loadConversation = async (state) => {
  console.log("loadConversation node comes");

  let conversation = await Conversation.findOne({
    business: state.businessId,
    visitor_id: state.visitorId,
    status: { $ne: "closed" },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      business: state.businessId,
      visitor_id: state.visitorId,
    });
  }

  const recentMessages = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();

  // Chronological order mein wapas karo (DB se latest-first aaya tha)
  const history = recentMessages
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  return {
    conversationId: conversation._id,
    conversationDoc: conversation,
    history,
  };
};

module.exports = { loadConversation };
