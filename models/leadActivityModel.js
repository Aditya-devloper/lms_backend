const mongoose = require("mongoose");

const leadActivitySchema = new mongoose.Schema(
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

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    activity_type: {
      type: String,
      enum: [
        "lead_created",
        "status_changed",
        "note_added",
        "followup_added",
        "followup_completed",
        "assigned",
        "updated",
        "converted",
        "lost",
      ],
      required: true,
    },

    description: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

leadActivitySchema.index({ lead: 1 });

module.exports = mongoose.model("LeadActivity", leadActivitySchema);
