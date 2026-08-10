const mongoose = require("mongoose");
const Business_Knowledge = require("../../models/businessKnowledge");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { embedTexts } = require("./embeddingModel");

const chunkText = async (text) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  return splitter.splitText(text);
};

const ingestDocument = async ({ businessId, text, sourceFileName }) => {
  try {
    const chunks = await chunkText(text);
    // const embeddings = await getEmbeddings(); langchain/gen-ai wala hai
    // const vectors = await embeddings.embedDocuments(chunks);
    const vectors = await embedTexts(chunks);

    const documents = chunks.map((chunk, i) => ({
      business_id: businessId,
      chunkText: chunk,
      embedding: vectors[i],
      sourceFile: sourceFileName,
    }));

    await Business_Knowledge.insertMany(documents);

    return { chunksStored: documents.length };
  } catch (error) {
    console.log("ingestDocument error", error);
    throw new Error(error.message);
  }
};

module.exports = { ingestDocument, chunkText };
