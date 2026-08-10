const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    business: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
    transaction_id: { type: String, trim: true, unique: true },
    plan: { type: String, trim: true },
    plan_amount: { type: Number },
    currency: { type: String },
    plan_gst: { type: Number },
    total_amount: { type: Number },
    type: { type: String, enum: ["credit", "debit"], default: "credit" },
    billing_cycle: { type: String, enum: ["monthly", "yearly"] },
    notes: { type: String, trim: true },
    start_date: { type: Date },
    end_date: { type: Date },
    is_active: { type: Boolean },
    mode: { type: String, default: "Subscription" }, // subscription, call-e recharge
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    order_details: {},
    payment_details: {},
    pg_charges: { type: Number, select: false },
  },
  { timestamps: true },
);

TransactionSchema.index({ user: 1 });
TransactionSchema.index({ status: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
