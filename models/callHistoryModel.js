const mongoose = require("mongoose");

const callHistorySchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    triggered_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task_text: { type: String },
    call_status: {
      type: String,
      enum: ["completed", "no_answer", "failed", "insufficient_credits"],
      required: true,
    },
    call_result: { type: mongoose.Schema.Types.Mixed }, // structuredResult from CALL-E
    cost_charged: { type: Number, default: 0 }, // kitna credit is call ke liye kata
    attempt_number: { type: Number, default: 1 },
    request_id: { type: String }, // idempotency tracking se link karne ke liye
  },
  { timestamps: true },
);

callHistorySchema.index({ business: 1 });
callHistorySchema.index({ lead: 1 });
callHistorySchema.index({ call_status: 1 });
callHistorySchema.index({ cost_charged: 1 });

module.exports = mongoose.model("CallHistory", callHistorySchema);
