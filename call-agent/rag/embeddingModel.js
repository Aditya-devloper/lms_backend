// const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

// let cachedEmbeddings = null;

// const getEmbeddings = async () => {
//   if (cachedEmbeddings) return cachedEmbeddings;

//   cachedEmbeddings = new GoogleGenerativeAIEmbeddings({
//     apiKey: process.env.GOOGLE_API_KEY,
//     model: "gemini-embedding-001",
//     outputDimensionality: 1536,
//   });

//   return cachedEmbeddings;
// };

// module.exports = { getEmbeddings };

// Embedding model — native @google/generative-ai SDK directly use kar rahe
// (LangChain wrapper mein outputDimensionality param kaam nahi karta — known bug)

const { GoogleGenerativeAI } = require("@google/generative-ai");

let cachedClient = null;

const getEmbeddingClient = () => {
  if (cachedClient) return cachedClient;
  cachedClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  return cachedClient;
};

const embedText = async (text) => {
  const client = getEmbeddingClient();
  const model = client.getGenerativeModel({ model: "gemini-embedding-001" });

  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    outputDimensionality: 1536,
  });

  return result.embedding.values;
};

const embedTexts = async (texts) => {
  const client = getEmbeddingClient();
  const model = client.getGenerativeModel({ model: "gemini-embedding-001" });

  const requests = texts.map((text) => ({
    content: { parts: [{ text }], role: "user" },
    outputDimensionality: 1536,
  }));

  const result = await model.batchEmbedContents({ requests });
  return result.embeddings.map((e) => e.values);
};

module.exports = { embedText, embedTexts };
