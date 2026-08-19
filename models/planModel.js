const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // "free", "starter", "growth", "pro"
    display_name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String },
    billing_cycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },

    included_calls: { type: Number, default: 0 },
    included_chat_messages: { type: Number, default: 0 },
    agent_limit: { type: Number, default: 1 },
    lead_limit: { type: Number, default: 50 },
    storage_limit: { type: Number },

    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
