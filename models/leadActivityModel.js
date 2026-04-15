const mongoose = require("mongoose");

const leadActivitySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    activity_type: { type: String }, // call, whatsapp, meeting, email
    description: { type: String },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    done_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

leadActivitySchema.index({ lead: 1 });

module.exports = mongoose.model("LeadActivity", leadActivitySchema);
