const mongoose = require("mongoose");

const Task = require("../models/task.model.js");
const Activity = require("../models/activity.model.js");

const { canAccessTask } = require("../utils/taskAccess.js");

// GET /api/tasks/:taskId/activities
const getTaskActivities = async (req, res) => {
  try {
    const { taskId } = req.params;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

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
        message: "You do not have access to this task's activities",
      });
    }

    const filter = { task: task._id };
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Activity.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Task activities fetched successfully",
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get task activities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task activities",
    });
  }
};

module.exports = {
  getTaskActivities,
};