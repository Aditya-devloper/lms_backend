const { graph } = require("../chat-agent/graph");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const Business = require("../models/businessModel");

const sendMessage = async (req, res) => {
  try {
    const { businessId, visitorId, message } = req.body;

    if (!businessId || !visitorId || !message) {
      return res.status(400).json({
        status: false,
        message: "businessId, visitorId, and message are required",
      });
    }

    const business = await Business.findById(businessId);
    const now = new Date();
    const isFreePlan = business?.plan?.name === "free";
    const isExpired =
      !isFreePlan &&
      (!business?.plan?.is_active ||
        !business?.plan?.end_date ||
        business.plan.end_date < now);

    if (isExpired) {
      return res.status(200).json({
        status: true,
        message: "Reply generated",
        response: {
          reply:
            "Thanks for reaching out! Our chat assistant is temporarily unavailable — please try contacting us directly, or check back soon.",
          conversationId: null,
        },
      });
    }

    const result = await graph.invoke({
      businessId,
      visitorId,
      userMessage: message,
    });

    return res.status(200).json({
      status: true,
      message: "Reply generated",
      response: {
        reply: result.aiResponse,
        conversationId: result.conversationId,
      },
    });
  } catch (error) {
    console.log("sendMessage error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getConversationHistory = async (req, res) => {
  try {
    const { businessId, visitorId } = req.body;

    const conversation = await Conversation.findOne({
      business: businessId,
      visitor_id: visitorId,
      status: { $ne: "closed" },
    });

    if (!conversation) {
      return res.status(200).json({ status: true, response: { messages: [] } });
    }

    const messages = await Message.find({
      conversation: conversation._id,
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      status: true,
      response: { messages, conversationId: conversation._id },
    });
  } catch (error) {
    console.log("getConversationHistory error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = { sendMessage, getConversationHistory };
