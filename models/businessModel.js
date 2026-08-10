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
    enable_calle: { type: Boolean, default: false },
    call_credits: { type: Number },
    plan: {
      name: {
        type: String,
        enum: ["free", "premium"],
        default: "free",
      },
      billing_cycle: { type: String },
      start_date: { type: Date },
      end_date: { type: Date },
      is_active: { type: Boolean },
      agent_limit: { type: Number, default: 1 },
      lead_limit: { type: Number, default: 50 },
    },
  },
  { timestamps: true },
);

businessSchema.index({ owner: 1 });

module.exports = mongoose.model("Business", businessSchema);
