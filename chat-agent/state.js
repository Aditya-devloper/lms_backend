const { Annotation } = require("@langchain/langgraph");

const ChatState = Annotation.Root({
  businessId: Annotation(),
  visitorId: Annotation(),
  userMessage: Annotation(),

  conversationId: Annotation(),
  conversationDoc: Annotation(),
  history: Annotation({
    default: () => [],
    reducer: (_, next) => next,
  }), // pichhle N messages, LLM ko context ke liye

  retrievedContext: Annotation({
    default: () => [],
    reducer: (_, next) => next,
  }),

  aiResponse: Annotation(),

  extractedInfo: Annotation({
    default: () => null,
    reducer: (_, next) => next,
  }),

  phoneNeedsClarification: Annotation({
    default: () => false,
    reducer: (_, next) => next,
  }),
});

module.exports = { ChatState };
