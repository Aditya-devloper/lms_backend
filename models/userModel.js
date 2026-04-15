const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true },
    pin: { type: String },
    image: { type: String },
    phone: { type: String },
    is_verified: { type: Boolean, default: false },
    user_type: {
      type: String,
      enum: ["owner", "agent", "admin"],
      default: "owner",
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    otp: { type: String },
    otp_expiry: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ business: 1 });

module.exports = mongoose.model("User", userSchema);
