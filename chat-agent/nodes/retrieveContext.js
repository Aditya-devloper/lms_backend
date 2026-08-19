const mongoose = require("mongoose");
const { retrieveRelevantChunks } = require("../../shared/rag/retriever");

const retrieveContext = async (state) => {
  console.log("retrieveContext node comes (chat)");

  const chunks = await retrieveRelevantChunks({
    businessId: new mongoose.Types.ObjectId(state.businessId),
    query: state.userMessage,
    topK: 4, // chat mein thoda kam rakha — call ke mukable frequent messages hote, cost control
  });

  return { retrievedContext: chunks };
};

module.exports = { retrieveContext };
