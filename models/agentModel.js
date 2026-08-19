const mongoose = require("mongoose");

const modulePermissions = (defaults = {}) => ({
  view: { type: Boolean, default: defaults.view ?? false },
  add: { type: Boolean, default: defaults.add ?? false },
  edit: { type: Boolean, default: defaults.edit ?? false },
  delete: { type: Boolean, default: defaults.delete ?? false },
});

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: { type: String },
    password: { type: String, required: true },
    phone: { type: String, unique: true, sparse: true },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    permissions: {
      leads: modulePermissions({ view: true }),
      calls: modulePermissions(),
      chat: modulePermissions({ view: true }),
      billing: {
        view: { type: Boolean, default: false },
      },
    },

    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "invited",
    },
    last_login: Date,
  },
  { timestamps: true },
);

agentSchema.index({ email: 1, business: 1 }, { unique: true });
agentSchema.index({ created_by: 1 });

module.exports = mongoose.model("Agent", agentSchema);
