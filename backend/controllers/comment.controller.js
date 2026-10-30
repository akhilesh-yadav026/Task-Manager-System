const mongoose = require("mongoose");

const Comment = require("../models/comment.model.js");
const Task = require("../models/task.model.js");
const logActivity = require("../utils/logActivity");

const { canAccessTask } = require("../utils/taskAccess");

// POST /api/tasks/:taskId/comments
const createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required",
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 5000 characters",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessTask(req.user, task);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const comment = await Comment.create({
      task: task._id,
      user: req.user.id,
      message: message.trim(),
    });
    await logActivity({
      taskId: task._id,
      userId: req.user.id,
      action: "COMMENT_ADDED",
      changes: [
        {
          field: "commentId",
          previousValue: null,
          newValue: comment.message,
        },  
      ],
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name email",
    );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};

// GET /api/tasks/:taskId/comments
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessTask(req.user, task);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const filter = { task: task._id };
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Comment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Comments fetched successfully",
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
};

// PUT /api/tasks/:taskId/comments/:commentId
const updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { message } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(taskId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID or comment ID",
      });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required",
      });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 5000 characters",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessTask(req.user, task);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      task: taskId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

// Only the original author can edit the comment.
if (comment.user.toString() !== req.user.id.toString()) {
  return res.status(403).json({
    success: false,
    message: "You can only edit your own comments",
  });
}

// 1. Store the original message before updating
const previousMessage = comment.message;

// 2. Update and save the comment
comment.message = message.trim();
await comment.save();

// 3. Record the change in the activity log
await logActivity({
  taskId: comment.task,
  userId: req.user.id,
  action: "COMMENT_UPDATED",
  changes: [
    {
      field: "message",
      previousValue: previousMessage,
      newValue: comment.message,
    },
  ],
});

  await logActivity({
      taskId: comment.task,
      userId: req.user.id,
      action: "COMMENT_UPDATED",
      changes: [
        {
          field: "message",
          previousValue: previousMessage,
          newValue: comment.message,
        },
      ],
    });
    const updatedComment = await Comment.findById(comment._id).populate(
      "user",
      "name email",
    );

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.error("Update comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment",
    });
  }
};

// DELETE /api/tasks/:taskId/comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(taskId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID or comment ID",
      });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessTask(req.user, task);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      task: taskId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const isAuthor = comment.user.toString() === req.user.id.toString();

    if (!isAuthor && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this comment",
      });
    }

    await comment.deleteOne();
    await logActivity({
      taskId: task._id,
      userId: req.user.id,
      action: "COMMENT_DELETED",
      changes: [
        {
          field: "commentId",
          previousValue: deletedCommentId,
          newValue: null,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

module.exports = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
};
