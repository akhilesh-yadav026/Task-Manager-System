const mongoose = require("mongoose");

const Task = require("../models/task.model.js");
const Project = require("../models/project.model.js");
const Team = require("../models/team.model.js");
const User = require("../models/user.model.js");
const logActivity = require("../utils/logActivity.js");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const ALLOWED_STATUSES = ["todo", "in_progress", "in_review", "done"];

const ALLOWED_PRIORITIES = ["low", "medium", "high", "urgent"];

const getId = (value) => value?._id || value?.id || value;

// Check whether a user can manage a team's tasks.
const canManageTeam = async (user, teamId) => {
  if (user.role === "admin") {
    return true;
  }

  const normalizedTeamId = getId(teamId);
  const managerTeamId = getId(user.team);

  if (
    user.role !== "manager" ||
    !managerTeamId ||
    !normalizedTeamId ||
    managerTeamId.toString() !== normalizedTeamId.toString()
  ) {
    return false;
  }

  const team = await Team.findById(normalizedTeamId).select("manager isActive");

  return Boolean(
    team &&
      team.isActive &&
      getId(team.manager).toString() === user.id.toString(),
  );
};

// Check whether a user can access a task.
const canAccessTask = async (user, task) => {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "employee") {
    const assigneeId = getId(task.assignee);
    return Boolean(assigneeId) && assigneeId.toString() === user.id.toString();
  }

  const taskTeamId = getId(task.team);
  const managerTeamId = getId(user.team);

  if (
    user.role === "manager" &&
    managerTeamId &&
    taskTeamId &&
    taskTeamId.toString() === managerTeamId.toString()
  ) {
    return canManageTeam(user, taskTeamId);
  }

  return false;
};

// Validate that an employee belongs to the project's team.
const validateAssignee = async (assigneeId, teamId) => {
  if (!isValidId(assigneeId)) {
    return {
      valid: false,
      message: "A valid assigneeId is required",
    };
  }

  const assignee = await User.findById(assigneeId).select(
    "_id name role team isActive",
  );

  if (!assignee) {
    return {
      valid: false,
      message: "Assignee not found",
    };
  }

  if (!assignee.isActive) {
    return {
      valid: false,
      message: "Cannot assign a task to an inactive user",
    };
  }

  if (assignee.role !== "employee") {
    return {
      valid: false,
      message: "Tasks must be assigned to an employee",
    };
  }

  if (!assignee.team || assignee.team.toString() !== teamId.toString()) {
    return {
      valid: false,
      message: "Assignee must belong to the project's team",
    };
  }

  const team = await Team.findById(teamId).select("members isActive");

  if (!team || !team.isActive) {
    return {
      valid: false,
      message: "Team not found or inactive",
    };
  }

  const isMember = team.members.some(
    (memberId) => memberId.toString() === assigneeId.toString(),
  );

  if (!isMember) {
    return {
      valid: false,
      message: "Assignee is not registered as a member of this team",
    };
  }

  return {
    valid: true,
    assignee,
  };
};

// 1. CREATE TASK
const createTask = async (req, res) => {
  try {
    const { title, description, projectId, assigneeId, priority, dueDate } =
      req.body;

    if (!title || !projectId || !assigneeId || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Title, projectId, assigneeId, and dueDate are required",
      });
    }

    if (!isValidId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid projectId",
      });
    }

    if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid dueDate",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const hasTeamAccess = await canManageTeam(req.user, project.team);

    if (!hasTeamAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot create tasks for this project",
      });
    }

    const assigneeCheck = await validateAssignee(assigneeId, project.team);

    if (!assigneeCheck.valid) {
      return res.status(400).json({
        success: false,
        message: assigneeCheck.message,
      });
    }

    const task = await Task.create({
      title,
      description,
      project: project._id,
      team: project.team,
      assignee: assigneeId,
      priority: priority || "medium",
      dueDate: parsedDueDate,
      createdBy: req.user.id,
      status: "todo",
    });
    await logActivity({
      taskId: task._id,
      userId: req.user.id,
      action: "TASK_CREATED",
      changes: [
        {
          field: "title",
          previousValue: null,
          newValue: task.title,
        },
        {
          field: "status",
          previousValue: null,
          newValue: task.status,
        },
        {
          field: "assignee",
          previousValue: null,
          newValue: task.assignee.toString(),
        },
      ],
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status")
      .populate("team", "name")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
    });
  }
};

// 2. GET TASKS WITH SEARCH, FILTERING, AND PAGINATION
const getAllTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      projectId,
      assigneeId,
      overdue,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      !Number.isInteger(limitNumber) ||
      pageNumber < 1 ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    const filter = {};

    // Admin can see all tasks.
    // Manager can see tasks for their own team.
    // Employee can see only tasks assigned to them.
    if (req.user.role === "manager") {
      if (!req.user.team) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: 0,
            totalPages: 0,
          },
        });
      }

      const hasAccess = await canManageTeam(req.user, req.user.team);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not manage an active team",
        });
      }

      filter.team = req.user.team;
    } else if (req.user.role === "employee") {
      filter.assignee = req.user.id;
    }

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }

      filter.status = status;
    }

    if (priority) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      filter.priority = priority;
    }

    if (projectId) {
      if (!isValidId(projectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid projectId",
        });
      }

      filter.project = projectId;
    }

    // Employees cannot use this filter to view other employees' tasks.
    if (assigneeId && req.user.role !== "employee") {
      if (!isValidId(assigneeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigneeId",
        });
      }

      filter.assignee = assigneeId;
    }

    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.title = {
        $regex: escapedSearch,
        $options: "i",
      };
    }

    if (overdue === "true") {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: "done" };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("project", "name status")
        .populate("team", "name")
        .populate("assignee", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Task.countDocuments(filter),
    ]);

    const now = new Date();

    const tasksWithOverdueFlag = tasks.map((task) => ({
      ...task,
      isOverdue: task.status !== "done" && new Date(task.dueDate) < now,
    }));

    return res.status(200).json({
      success: true,
      message: "Tasks fetched successfully",
      data: tasksWithOverdueFlag,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
};

const csvCell = (value) => {
  const text = value == null ? "" : String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const exportTasksCsv = async (req, res) => {
  try {
    const { search, status, priority } = req.query;
    const filter = {};

    if (req.user.role === "manager") {
      if (!req.user.team) {
        filter._id = { $exists: false };
      } else {
        const hasAccess = await canManageTeam(req.user, req.user.team);

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "You do not manage an active team",
          });
        }

        filter.team = req.user.team;
      }
    } else if (req.user.role === "employee") {
      filter.assignee = req.user.id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to export tasks",
      });
    }

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
      }
      filter.status = status;
    }

    if (priority) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.title = { $regex: escapedSearch, $options: "i" };
    }

    const tasks = await Task.find(filter)
      .populate("project", "name")
      .populate("team", "name")
      .populate("assignee", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const columns = [
      ["Task", (task) => task.title],
      ["Description", (task) => task.description],
      ["Project", (task) => task.project?.name],
      ["Team", (task) => task.team?.name],
      ["Assignee", (task) => task.assignee?.name],
      ["Assignee email", (task) => task.assignee?.email],
      ["Priority", (task) => task.priority],
      ["Status", (task) => task.status],
      ["Due date", (task) => task.dueDate ? new Date(task.dueDate).toISOString() : ""],
      ["Overdue", (task) => task.status !== "done" && task.dueDate && new Date(task.dueDate) < new Date() ? "Yes" : "No"],
      ["Created at", (task) => task.createdAt ? new Date(task.createdAt).toISOString() : ""],
    ];

    const rows = [
      columns.map(([heading]) => csvCell(heading)).join(","),
      ...tasks.map((task) =>
        columns.map(([, getValue]) => csvCell(getValue(task))).join(","),
      ),
    ];
    const csv = `\uFEFF${rows.join("\r\n")}`;
    const filename = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error("Export tasks CSV error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export tasks",
    });
  }
};

// 3. GET TASK BY ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id)
      .populate("project", "name description status")
      .populate("team", "name")
      .populate("assignee", "name email")
      .populate("createdBy", "name email")

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canAccessTask(req.user, task);
//     console.log("User:", {
//   id: req.user.id,
//   role: req.user.role,
//   team: req.user.team,
// });

// console.log("Task:", {
//   id: task._id,
//   team: task.team?._id,
//   assignee: task.assignee?._id,
// });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...task.toObject(),
        isOverdue:
          task.status !== "done" && new Date(task.dueDate) < new Date(),
      },
    });
  } catch (error) {
    console.error("Get task error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch task",
    });
  }
};

// 4. UPDATE TASK DETAILS OR REASSIGN
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canManageTeam(req.user, task.team);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this task",
      });
    }

    const { title, description, priority, dueDate, assigneeId } = req.body;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Title must contain at least 3 characters",
        });
      }

      task.title = title;
    }

    if (description !== undefined) {
      task.description = description;
    }

    if (priority !== undefined) {
      if (!ALLOWED_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
      }

      task.priority = priority;
    }

    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid dueDate",
        });
      }

      task.dueDate = parsedDueDate;
    }

    if (assigneeId !== undefined) {
      const assigneeCheck = await validateAssignee(assigneeId, task.team);

      if (!assigneeCheck.valid) {
        return res.status(400).json({
          success: false,
          message: assigneeCheck.message,
        });
      }

      task.assignee = assigneeId;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("project", "name status")
      .populate("team", "name")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
    });
  }
};

// 5. UPDATE TASK STATUS
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }
// console.log("Received status:", req.body.status);
// console.log("Allowed statuses:", ALLOWED_STATUSES);
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    const task = await Task.findById(id);

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
        message: "You cannot update this task",
      });
    }

    const oldStatus = task.status;

    if (oldStatus === status) {
      return res.status(400).json({
        success: false,
        message: "Task is already in this status",
      });
    }

    if (req.user.role === "employee") {
      const allowedEmployeeTransitions = {
        todo: ["in_progress"],
        in_progress: ["in_review"],
        in_review: [],
        done: [],
      };

      if (!allowedEmployeeTransitions[oldStatus]?.includes(status)) {
        return res.status(403).json({
          success: false,
          message:
            "Employees can only move tasks from To Do to In Progress and from In Progress to In Review",
        });
      }
    }

    if (req.user.role === "manager") {
      const allowedManagerTransitions = {
        todo: [],
        in_progress: [],
        in_review: ["done", "in_progress"],
        done: [],
      };

      if (!allowedManagerTransitions[oldStatus]?.includes(status)) {
        return res.status(403).json({
          success: false,
          message:
            "Managers can approve tasks in review or return them for rework",
        });
      }

      if (status === "in_progress") {
        if (typeof reason !== "string" || !reason.trim()) {
          return res.status(400).json({
            success: false,
            message: "A reason is required when returning a task for rework",
          });
        }
      }
    }

    if (status === "in_review" && req.user.role === "manager") {
      return res.status(403).json({
        success: false,
        message: "Managers cannot submit employee tasks for review",
      });
    }

    if (status === "done" && req.user.role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot mark tasks as done",
      });
    }

    if (status === "in_progress" && oldStatus === "in_review") {
      if (typeof reason !== "string" || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: "A reason is required when returning a task for rework",
        });
      }
    }


    task.status = status;

    if (status === "done") {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();
    await logActivity({
      taskId: task._id,
      userId: req.user.id,
      action: "STATUS_CHANGED",
      changes: [
        {
          field: "status",
          previousValue: oldStatus,
          newValue: status,
        },
      ],
      reason: reason || "",
    });

    const updatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("Update task status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update task status",
    });
  }
};

// 6. DELETE TASK
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const hasAccess = await canManageTeam(req.user, task.team);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this task",
      });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  exportTasksCsv,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
