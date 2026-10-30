const mongoose = require("mongoose");

const Project = require("../models/project.model.js");
const Team = require("../models/team.model.js");
const Task = require("../models/task.model.js");

// Validate MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getId = (value) => value?._id || value?.id || value;

// Check whether a user can access a project's team
const canAccessTeam = async (user, teamId) => {
  if (user.role === "admin") {
    return true;
  }

  const normalizedTeamId = getId(teamId)?.toString();
  const managerTeamId = getId(user.team)?.toString();

  if (!managerTeamId || managerTeamId !== normalizedTeamId) {
    return false;
  }

  // Additional check: the manager must actually manage this team.
  if (user.role === "manager") {
    const team = await Team.findById(normalizedTeamId).select("manager isActive");

    return (
      team &&
      team.isActive &&
      getId(team.manager).toString() === getId(user.id).toString()
    );
  }

  // Employees can view projects belonging to their own team.
  return user.role === "employee";
};

// Check whether a user can access a particular project
const canAccessProject = async (user, project) => {
  return canAccessTeam(user, getId(project.team));
};

// 1. Create project
const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      clientName,
      teamId,
      startDate,
      endDate,
      status,
    } = req.body;

    if (!name || !clientName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, clientName, startDate, and endDate are required",
      });
    }

    // Managers must create projects for their own team.
    // Admins can choose a team.
    let selectedTeamId;

    if (req.user.role === "manager") {
      if (!req.user.team) {
        return res.status(400).json({
          success: false,
          message: "You are not assigned to a team",
        });
      }

      selectedTeamId = req.user.team.toString();

      const canManage = await canAccessTeam(req.user, selectedTeamId);

      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: "You cannot create projects for this team",
        });
      }
    } else {
      if (!teamId || !isValidId(teamId)) {
        return res.status(400).json({
          success: false,
          message: "A valid teamId is required",
        });
      }

      selectedTeamId = teamId;
    }

    const team = await Team.findById(selectedTeamId);

    if (!team || !team.isActive) {
      return res.status(404).json({
        success: false,
        message: "Team not found or inactive",
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid startDate and endDate values",
      });
    }

    if (parsedEndDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const allowedStatuses = [
      "planning",
      "active",
      "completed",
      "on_hold",
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    const project = await Project.create({
      name,
      description,
      clientName,
      team: selectedTeamId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      status: status || "planning",
      createdBy: req.user.id,
    });

    const populatedProject = await Project.findById(project._id)
      .populate("team", "name manager")
      .populate("createdBy", "name email role");

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create project",
    });
  }
};

// 2. Get all accessible projects with search, filters, and pagination
const getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      teamId,
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
        message: "Page must be positive and limit must be between 1 and 100",
      });
    }

    const filter = {};

    // Enforce team-level access on the server.
    if (req.user.role !== "admin") {
      if (!req.user.team) {
        return res.status(200).json({
          success: true,
          message: "Projects fetched successfully",
          data: [],
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total: 0,
            totalPages: 0,
          },
        });
      }

      filter.team = req.user.team;
    } else if (teamId) {
      if (!isValidId(teamId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teamId",
        });
      }

      filter.team = teamId;
    }

    if (status) {
      const allowedStatuses = [
        "planning",
        "active",
        "completed",
        "on_hold",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project status",
        });
      }

      filter.status = status;
    }

    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { clientName: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("team", "name")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Project.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      data: projects,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
    });
  }
};

// 3. Get one project by ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id)
      .populate("team", "name manager members")
      .populate("createdBy", "name email role");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const hasAccess = await canAccessProject(req.user, project);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project fetched successfully",
      data: project,
    });
  } catch (error) {
    console.error("Get project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project",
    });
  }
};

// 4. Update project details
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const hasAccess = await canAccessProject(req.user, project);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this project",
      });
    }

    // Team changes are handled separately to avoid moving projects
    // across teams without validating ownership and task assignments.
    const allowedFields = [
      "name",
      "description",
      "clientName",
      "startDate",
      "endDate",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    }

    if (
      !project.name?.trim() ||
      !project.clientName?.trim() ||
      !project.startDate ||
      !project.endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, clientName, startDate, and endDate are required",
      });
    }

    if (
      Number.isNaN(new Date(project.startDate).getTime()) ||
      Number.isNaN(new Date(project.endDate).getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid project dates",
      });
    }

    if (new Date(project.endDate) < new Date(project.startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("team", "name")
      .populate("createdBy", "name email");

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update project",
    });
  }
};

// 5. Update project status
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const allowedStatuses = [
      "planning",
      "active",
      "completed",
      "on_hold",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const hasAccess = await canAccessProject(req.user, project);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot change this project's status",
      });
    }

    project.status = status;
    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Update project status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update project status",
    });
  }
};

// 6. Delete project only when it has no tasks
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const hasAccess = await canAccessProject(req.user, project);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this project",
      });
    }

    const taskCount = await Task.countDocuments({
      project: project._id,
    });

    if (taskCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a project that contains tasks",
        taskCount,
      });
    }

    await Project.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
};
