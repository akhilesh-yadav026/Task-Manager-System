const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_ASSIGNED",
        "TASK_REASSIGNED",
        "STATUS_CHANGED",
        "COMMENT_ADDED",
        "COMMENT_UPDATED",
        "COMMENT_DELETED",
      ],
      required: true,
    },

    changes: [
      {
        field: {
          type: String,
          required: true,
        },

        previousValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },

        newValue: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],

    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

activitySchema.index({ task: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
