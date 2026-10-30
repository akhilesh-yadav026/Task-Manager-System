const express = require("express");

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
} = require("../controllers/project.controller.js");

const { protect } = require("../middleware/authMiddleware.js");
const authorizeRoles = require("../middleware/authorizeRoles.js");

const router = express.Router();

// All project routes require authentication.
router.use(protect);

// Create a project
router.post(
  "/",
  authorizeRoles("admin", "manager"),
  createProject
);

// Get accessible projects
router.get("/", getAllProjects);

// Keep this specific route before /:id routes.
router.patch(
  "/:id/status",
  authorizeRoles("admin", "manager"),
  updateProjectStatus
);

// Get project details
router.get("/:id", getProjectById);

// Update project details
router.put(
  "/:id",
  authorizeRoles("admin", "manager"),
  updateProject
);

// Delete project
router.delete(
  "/:id",
  authorizeRoles("admin", "manager"),
  deleteProject
);

module.exports = router;