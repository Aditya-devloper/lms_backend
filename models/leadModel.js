const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost", "contact_in_future"],
      default: "new",
    },
    source: { type: String }, // email, phone
    follow_up_date: { type: Date, required: true },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

leadSchema.index({ name: 1 });
leadSchema.index({ business: 1 });

const Lead = mongoose.model("Lead", leadSchema);
