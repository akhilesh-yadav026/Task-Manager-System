const express = require("express");

const {
  createTask,
  getAllTasks,
  exportTasksCsv,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require("../controllers/task.controller.js");

const { protect } = require("../middleware/authMiddleware.js");
const authorizeRoles = require("../middleware/authorizeRoles.js");
const commentRoutes = require("./comment.route.js")
const activityRoutes =  require("./activity.route.js")

const router = express.Router();

// All task routes require authentication.
router.use(protect);

// Create and assign a task.
router.post(
  "/",
  authorizeRoles("admin", "manager"),
  createTask
);

// List tasks accessible to the logged-in user.
router.get("/", getAllTasks);

// Download tasks as CSV using the same role-scoped access as the task list.
router.get("/export/csv", exportTasksCsv);

// Keep the more specific route before /:id.
router.patch(
  "/:id/status",
  updateTaskStatus
);

router.use("/:taskId/comments", commentRoutes);
router.use("/:taskId/activities", activityRoutes);

// Get one task.
router.get("/:id", getTaskById);

// Update task details or reassign it.
router.put(
  "/:id",
  authorizeRoles("admin", "manager"),
  updateTask
);

// Delete a task.
router.delete(
  "/:id",
  authorizeRoles("admin", "manager"),
  deleteTask
);

module.exports = router;
