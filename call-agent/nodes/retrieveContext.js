const { retrieveRelevantChunks } = require("../rag/retriever");

const retrieveContext = async (state) => {
  console.log("retrieveContext node comes");

  const { leadData } = state;

  const query = leadData.notes || leadData.name;

  const chunks = await retrieveRelevantChunks({
    businessId: leadData.business,
    query,
    topK: 5,
  });

  console.log("retrieveContext chunks =>", chunks.length);
  return { retrievedContext: chunks };
};

module.exports = { retrieveContext };
