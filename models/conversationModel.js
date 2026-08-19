const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    visitor_id: { type: String, required: true }, // frontend cookie/localStorage se generate
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    channel: { type: String, default: "chat" },
    status: {
      type: String,
      enum: ["active", "handed_off", "closed"],
      default: "active",
    },
    qualification: {
      requirement_summary: { type: String },
      budget_mentioned: { type: String },
      timeline: { type: String },
    },
    visitor_name: { type: String },
    visitor_phone: { type: String },
    visitor_email: { type: String },
    visitor_country: { type: String },
    pending_raw_phone: { type: String },
    last_active_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

conversationSchema.index({ business: 1, visitor_id: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
