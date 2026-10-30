const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_STATUS_CHANGED",
        "TASK_DUE_SOON",
      ],
      required: true, 
    },

    message: {
      type: String,
      required: true, 
      trim: true,
     
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Efficiently retrieve a user's newest notifications
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});


const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

module.exports = Notification;