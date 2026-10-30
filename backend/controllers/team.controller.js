
const mongoose = require("mongoose");
const Team = require("../models/team.model.js");
const User = require("../models/user.model.js");
const Project = require("../models/project.model.js");
const Task = require("../models/task.model.js");

// Helper: validate MongoDB ObjectId
const isValidId = (id) => mongoose.isValidObjectId(id);

// Helper: compare ObjectIds safely
const sameId = (first, second) =>
  first && second && first.toString() === second.toString();

// CREATE TEAM
// POST /api/teams
// Admin only
const createTeam = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { name, managerId } = req.body;

    if (!name || !name.trim() || !managerId) {
      return res.status(400).json({
        success: false,
        message: "Team name and managerId are required",
      });
    }

    if (!isValidId(managerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid manager ID",
      });
    }

    const existingTeam = await Team.findOne({
      name: name.trim(),
    });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: "A team with this name already exists",
      });
    }

    const manager = await User.findById(managerId);

    if (!manager || manager.role !== "manager") {
      return res.status(400).json({
        success: false,
        message: "A valid manager account is required",
      });
    }

    if (manager.team) {
      return res.status(409).json({
        success: false,
        message: "This manager already belongs to a team",
      });
    }

    let createdTeam;

    await session.withTransaction(async () => {
      const teams = await Team.create(
        [
          {
            name: name.trim(),
            manager: manager._id,
            members: [],
            createdBy: req.user.id,
          },
        ],
        { session }
      );

      createdTeam = teams[0];

      await User.updateOne(
        {
          _id: manager._id,
          role: "manager",
          team: null,
        },
        {
          $set: { team: createdTeam._id },
        },
        { session }
      ).then((result) => {
        if (result.modifiedCount !== 1) {
          throw new Error(
            "Manager assignment failed. Please retry."
          );
        }
      });
    });

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: {
        team: createdTeam,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Team name or manager is already assigned",
      });
    }

    console.error("Create team error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create team",
    });
  } finally {
    await session.endSession();
  }
};

// GET ALL TEAMS
// GET /api/teams
// Admin only
const getAllTeams = async (req, res) => {
  try {
    let teams;

    // Admin can access every team.
    if (req.user.role === "admin") {
      teams = await Team.find()
        .populate("manager", "name email role")
        .populate("members", "name email role")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });
    }

    // Manager can access only their own team.
    else if (req.user.role === "manager") {
      if (!req.user.team) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: { teams: [] },
        });
      }

      const team = await Team.findOne({
        _id: req.user.team,
      })
        .populate("manager", "name email role")
        .populate("members", "name email role")
        .populate("createdBy", "name email");

      teams = team ? [team] : [];
    }

    // All other roles are denied.
    else {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access teams.",
      });
    }

    return res.status(200).json({
      success: true,
      count: teams.length,
      data: { teams },
    });
  } catch (error) {
    console.error("Get teams error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch teams",
    });
  }
};


// GET TEAM BY ID
// GET /api/teams/:id
// Admin or the team's manager
const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findById(id)
      .populate("manager", "name email role")
      .populate("members", "name email role")
      .populate("createdBy", "name email");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Managers may access only their own team.
    if (
      req.user.role !== "admin" &&
      !sameId(req.user.team, team._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access another team's details",
      });
    }

    return res.status(200).json({
      success: true,
      data: { team },
    });
  } catch (error) {
    console.error("Get team error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch team",
    });
  }
};

// UPDATE TEAM
// PUT /api/teams/:id
// Admin only
const updateTeam = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { name, managerId, isActive } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    if (
      name === undefined &&
      managerId === undefined &&
      isActive === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Team name cannot be empty",
      });
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    if (
      managerId !== undefined &&
      !isValidId(managerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid manager ID",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (name !== undefined) {
      const duplicateName = await Team.findOne({
        name: name.trim(),
        _id: { $ne: team._id },
      });

      if (duplicateName) {
        return res.status(409).json({
          success: false,
          message: "A team with this name already exists",
        });
      }
    }

    const changingManager =
      managerId !== undefined &&
      !sameId(managerId, team.manager);

    if (changingManager) {
      const newManager = await User.findById(managerId);

      if (
        !newManager ||
        newManager.role !== "manager"
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid manager account is required",
        });
      }

      if (
        newManager.team &&
        !sameId(newManager.team, team._id)
      ) {
        return res.status(409).json({
          success: false,
          message: "The new manager already belongs to another team",
        });
      }

      await session.withTransaction(async () => {
        const oldManagerId = team.manager;

        // Assign the new manager to this team.
        if (
          !sameId(oldManagerId, newManager._id)
        ) {
          const result = await User.updateOne(
            {
              _id: newManager._id,
              role: "manager",
              $or: [
                { team: null },
                { team: team._id },
              ],
            },
            {
              $set: { team: team._id },
            },
            { session }
          );

          if (result.modifiedCount !== 1) {
            throw new Error(
              "Unable to assign the new manager"
            );
          }

          // Remove the old manager's team assignment.
          await User.updateOne(
            {
              _id: oldManagerId,
              team: team._id,
            },
            {
              $set: { team: null },
            },
            { session }
          );

          team.manager = newManager._id;
        }
      });
    }

    if (name !== undefined) {
      team.name = name.trim();
    }

    if (isActive !== undefined) {
      team.isActive = isActive;
    }

    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate("manager", "name email role")
      .populate("members", "name email role");

    return res.status(200).json({
      success: true,
      message: "Team updated successfully",
      data: { team: updatedTeam },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Team name or manager is already assigned",
      });
    }

    console.error("Update team error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update team",
    });
  } finally {
    await session.endSession();
  }
};

// ADD EMPLOYEE TO TEAM
// POST /api/teams/:id/members
// Admin only
const addTeamMember = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!isValidId(id) || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid team ID and userId are required",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (!team.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot add members to an inactive team",
      });
    }

    const employee = await User.findById(userId);

    if (
      !employee ||
      employee.role !== "employee"
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid employee account is required",
      });
    }

    if (team.members.some((memberId) =>
      sameId(memberId, employee._id)
    )) {
      return res.status(409).json({
        success: false,
        message: "Employee is already a member of this team",
      });
    }

    if (employee.team) {
      return res.status(409).json({
        success: false,
        message: "Employee already belongs to a team",
      });
    }

    await session.withTransaction(async () => {
      const result = await User.updateOne(
        {
          _id: employee._id,
          role: "employee",
          team: null,
        },
        {
          $set: { team: team._id },
        },
        { session }
      );

      if (result.modifiedCount !== 1) {
        throw new Error(
          "Employee assignment failed. Please retry."
        );
      }

      await Team.updateOne(
        { _id: team._id },
        {
          $addToSet: { members: employee._id },
        },
        { session }
      );
    });

    const updatedTeam = await Team.findById(id)
      .populate("manager", "name email")
      .populate("members", "name email role");

    return res.status(200).json({
      success: true,
      message: "Employee added to team successfully",
      data: { team: updatedTeam },
    });
  } catch (error) {
    console.error("Add team member error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add employee to team",
    });
  } finally {
    await session.endSession();
  }
};

// REMOVE EMPLOYEE FROM TEAM
// DELETE /api/teams/:id/members/:userId
// Admin only
const removeTeamMember = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id, userId } = req.params;

    if (!isValidId(id) || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID or user ID",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    const isMember = team.members.some((memberId) =>
      sameId(memberId, userId)
    );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "Employee is not a member of this team",
      });
    }

    await session.withTransaction(async () => {
      await Team.updateOne(
        { _id: team._id },
        { $pull: { members: userId } },
        { session }
      );

      await User.updateOne(
        {
          _id: userId,
          team: team._id,
          role: "employee",
        },
        {
          $set: { team: null },
        },
        { session }
      );
    });

    return res.status(200).json({
      success: true,
      message: "Employee removed from team successfully",
    });
  } catch (error) {
    console.error("Remove team member error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to remove employee from team",
    });
  } finally {
    await session.endSession();
  }
};

// DELETE TEAM
// DELETE /api/teams/:id
// Admin only
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Do not delete a team that still has projects or tasks.
    const [projectCount, taskCount] = await Promise.all([
      Project.countDocuments({ team: team._id }),
      Task.countDocuments({ team: team._id }),
    ]);

    if (projectCount > 0 || taskCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a team that has projects or tasks",
        data: {
          projectCount,
          taskCount,
        },
      });
    }

    await User.updateMany(
      { team: team._id },
      { $set: { team: null } }
    );

    await Team.findByIdAndDelete(team._id);

    return res.status(200).json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Delete team error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete team",
    });
  }
};

module.exports = {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  deleteTeam,
};
