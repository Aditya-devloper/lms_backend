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
    notes: { type: String },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "interested",
        "proposal-sent",
        "converted",
        "lost",
      ],
      default: "new",
    },
    source: { type: String }, // email, phone, referral, website, call, whatsapp, email
    follow_up_date: { type: Date, required: true },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

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

module.exports = mongoose.model("Lead", leadSchema);
