// const { getEmbeddings } = require("./embeddingModel");
const Business_Knowledge = require("../../models/businessKnowledge");
const { embedText } = require("./embeddingModel");

const VECTOR_INDEX_NAME = "vector_index";

const retrieveRelevantChunks = async ({ businessId, query, topK = 5 }) => {
  // const embeddings = await getEmbeddings();
  const queryVector = await embedText(query);

  const results = await Business_Knowledge.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: queryVector,
        numCandidates: 100,
        limit: topK,
        filter: { business_id: businessId },
      },
    },
    {
      $project: {
        chunkText: 1,
        sourceFile: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return results.map((r) => r.chunkText);
};

module.exports = { retrieveRelevantChunks };
