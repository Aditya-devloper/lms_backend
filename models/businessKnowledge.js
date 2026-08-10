const mongoose = require("mongoose");

const businessKnowledgeSchema = new mongoose.Schema(
  {
    business_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    chunkText: { type: String, required: true, trim: true },
    embedding: { type: [Number], required: true },
    sourceFile: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Business_Knowledge", businessKnowledgeSchema);

// Mongo DB Atlas Search Index Definition for Business_Knowledge collection
// {
//   "fields": [
//     {
//       "type": "vector",
//       "path": "embedding",
//       "numDimensions": 1536,
//       "similarity": "cosine"
//     },
//     {
//       "type": "filter",
//       "path": "business_id"
//     }
//   ]
// }
