const fs = require("fs");
const { parseFile } = require("../agent/rag/fileParser");
const { ingestDocument } = require("../agent/rag/ingest");
const { retrieveRelevantChunks } = require("../agent/rag/retriever");
const { getModel } = require("../agent/llmModel");
const BusinessKnowledge = require("../models/businessKnowledge");
const { getBusinessContext } = require("./business");

const uploadKnowledgeDocument = async (req, res) => {
  let filePath = null;
  try {
    const businessId = req.user.business;

    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "No file uploaded" });
    }

    filePath = req.file.path;

    // File ko plain text mein convert
    const text = await parseFile(filePath, req.file.originalname);

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "File is empty or unreadable" });
    }

    // Chunk + embed + Atlas mein store
    const result = await ingestDocument({
      businessId,
      text,
      sourceFileName: req.file.originalname,
    });

    return res.status(200).json({
      status: true,
      message: "Document uploaded successfully",
      response: result,
    });
  } catch (error) {
    console.log("uploadKnowledgeDocument error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  } finally {
    if (filePath) {
      fs.promises.unlink(filePath).catch((err) => {
        console.error("Cleanup failed:", err.message);
      });
    }
  }
};

const askQuestion = async ({ businessId, question }) => {
  // Step 1 — relevant chunks nikalo vector DB se
  const chunks = await retrieveRelevantChunks({
    businessId,
    query: question,
    topK: 5,
  });

  if (chunks.length === 0) {
    return {
      answer: "No relevant information found in the uploaded documents.",
      retrievedChunks: [],
    };
  }

  // Step 2 — LLM ko sirf retrieved context ke saath answer karne bolo
  const business = await getBusinessContext(businessId);
  const model = await getModel();

  const prompt = `You are a helpful assistant answering questions on behalf of ${business.name}${
    business.type ? `, a ${business.type} business` : ""
  }. Answer using ONLY the context below — do not invent facts not mentioned in it.
    
    If the exact answer isn't in the context, don't just say you don't have it — instead:
    - Mention what related information IS available in the context, if anything is relevant
    - Sound like a helpful team member, not a search engine
    - Only say you don't have the information if truly nothing related exists in the context
    
    Context:
    ${chunks.join("\n\n---\n\n")}
    
    Question: ${question}
    
    Answer (2-3 sentences, natural and conversational):`;

  const response = await model.invoke(prompt);

  return {
    answer: response.content,
    retrievedChunks: chunks, // ye bhi return kar rahe taaki dekh sake kya-kya retrieve hua
  };
};

const testRagQuestion = async (req, res) => {
  try {
    const businessId = req.user.business;
    const { question } = req.body;

    if (!question) {
      return res
        .status(400)
        .json({ status: false, message: "question is required" });
    }

    const result = await askQuestion({ businessId, question });

    return res.status(200).json({
      status: true,
      message: "Answer generated",
      response: result,
    });
  } catch (error) {
    console.log("testRagQuestion error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const getDocStatus = async (req, res) => {
  try {
    const businessId = req.user.business;

    const doc = await BusinessKnowledge.findOne({
      business_id: businessId,
    }).sort({ createdAt: -1 });

    if (!doc) {
      return res.status(200).json({
        status: true,
        message: "No document uploaded",
        response: null,
      });
    }

    const chunkCount = await BusinessKnowledge.countDocuments({
      business_id: businessId,
    });

    return res.status(200).json({
      status: true,
      message: "Document status fetched",
      response: {
        name: doc.sourceFile,
        uploadedAt: doc.createdAt,
        chunkCount,
      },
    });
  } catch (error) {
    console.log("getDocStatus error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      response: error.message,
    });
  }
};

const deleteDoc = async (req, res) => {
  try {
    const businessId = req.user.business;

    const result = await BusinessKnowledge.deleteMany({
      business_id: businessId,
    });

    return res.status(200).json({
      status: true,
      message: "Document deleted successfully",
      response: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.log("deleteDoc error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  uploadKnowledgeDocument,
  testRagQuestion,
  getDocStatus,
  deleteDoc,
};
