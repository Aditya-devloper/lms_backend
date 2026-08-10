const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "qualified",
        "interested",
        "proposal-sent",
        "converted",
        "negotiation",
        "lost",
      ],
      default: "new",
    },
    source: { type: String, trim: true }, // email, phone, referral, website, call, whatsapp, email
    follow_up_date: { type: Date, required: true },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    call_attempts: { type: Number, default: 0 },
    last_call_at: { type: Date },
    last_call_status: {
      type: String,
      enum: ["not_called", "no_answer", "completed", "failed"],
      default: "not_called",
    },
    last_call_result: { type: mongoose.Schema.Types.Mixed }, // CALL-E ka structuredResult yahan store hoga
    call_summary: { type: String, trim: true },

    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

leadSchema.index({ name: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ business: 1 });
leadSchema.index({ created_by: 1 });

leadSchema.index(
  { business: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $exists: true, $ne: "" },
    },
  },
);

module.exports = mongoose.model("Lead", leadSchema);
