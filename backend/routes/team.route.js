
const express = require("express");

const {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
} = require("../controllers/team.controller.js");

const { protect } = require("../middleware/authMiddleware.js");
const authorizeRoles = require("../middleware/authorizeRoles.js");

const router = express.Router();

// All team routes require authentication.
router.use(protect);

// Create a team: Admin only.
router.post(
  "/",
  authorizeRoles("admin"),
  createTeam
);

// List teams: Admin only.
router.get(
  "/",
  authorizeRoles("admin","manager"),
  getAllTeams
);

// Get a team: Admin or Manager.
// Controller verifies that managers can access only their own team.
router.get(
  "/:id",
  authorizeRoles("admin", "manager"),
  getTeamById
);

// Update team: Admin only.
router.put(
  "/:id",
  authorizeRoles("admin"),
  updateTeam
);

// Add an employee: Admin only.
router.post(
  "/:id/members",
  authorizeRoles("admin"),
  addTeamMember
);

// Remove an employee: Admin only.
router.delete(
  "/:id/members/:userId",
  authorizeRoles("admin"),
  removeTeamMember
);

// Delete team: Admin only.
router.delete(
  "/:id",
  authorizeRoles("admin"),
  deleteTeam
);

module.exports = router;
