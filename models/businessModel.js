const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    business_name: { type: String, required: true, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business_type: { type: String },
    image: { type: String },
    address: { type: String, trim: true },
    business_email: { type: String },
    business_phone: { type: String },
    plan: {
      name: { type: String, enum: ["free", "pro"], default: "free" },
      agent_limit: { type: Number, default: 1 },
      lead_limit: { type: Number, default: 50 },
      amount: { type: Number, default: 0 },
      start_date: { type: Date },
      expiry_date: { type: Date },
    },
  },
  { timestamps: true },
);

businessSchema.index({ owner: 1 });

module.exports = mongoose.model("Business", businessSchema);
