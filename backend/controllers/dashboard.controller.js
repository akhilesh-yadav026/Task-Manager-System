const Task = require("../models/task.model.js");
const Project = require("../models/project.model.js");
const Team = require("../models/team.model.js");
const User = require("../models/user.model.js");

const getDashboard = async (req, res) => {
  try {
    const { id: userId, role, team: userTeam } = req.user;

    // Define which records the current user is allowed to see.
    let taskFilter = {};
    let projectFilter = {};
    let teamFilter = {};
    let userFilter = {};

    if (role === "admin") {
      // Admin can view all records.
      taskFilter = {};
      projectFilter = {};
      teamFilter = {};
      userFilter = {};
    } else if (role === "manager") {
      // Managers can only view records from their own team.
      if (!userTeam) {
        return res.status(200).json({
          success: true,
          message: "Dashboard fetched successfully",
          data: {
            overview: {},
            tasksByStatus: [],
            tasksByPriority: [],
            recentTasks: [],
            teamPerformance: [],
          },
        });
      }

      taskFilter = { team: userTeam };
      projectFilter = { team: userTeam };
      teamFilter = { _id: userTeam };
      userFilter = { team: userTeam, role: "employee" };
    } else if (role === "employee") {
      // Employees can only view their own assigned tasks.
      taskFilter = { assignee: userId };

      // Projects associated with the employee's team.
      projectFilter = userTeam ? { team: userTeam } : { _id: null };

      // Do not expose team-wide statistics to employees.
      teamFilter = { _id: null };
      userFilter = { _id: userId };
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this dashboard",
      });
    }

    const now = new Date();

    const overdueFilter = {
      ...taskFilter,
      dueDate: { $lt: now },
      status: { $ne: "done" },
    };

    const [
      totalUsers,
      totalTeams,
      totalProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      inReviewTasks,
      completedTasks,
      overdueTasks,
      tasksByStatus,
      tasksByPriority,
      recentTasks,
      teamPerformance,
    ] = await Promise.all([
      User.countDocuments(userFilter),

      Team.countDocuments(teamFilter),

      Project.countDocuments(projectFilter),

      Task.countDocuments(taskFilter),

      Task.countDocuments({
        ...taskFilter,
        status: "todo",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "in_progress",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "in_review",
      }),

      Task.countDocuments({
        ...taskFilter,
        status: "done",
      }),

      Task.countDocuments(overdueFilter),

      Task.aggregate([
        { $match: taskFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Task.aggregate([
        { $match: taskFilter },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Task.find(taskFilter)
        .select("title status priority dueDate assignee project team createdAt")
        .populate("assignee", "name email")
        .populate("project", "name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Only Admins and Managers see team performance.
      role === "employee"
        ? Promise.resolve([])
        : Task.aggregate([
            { $match: taskFilter },
            {
              $group: {
                _id: "$assignee",
                totalTasks: { $sum: 1 },
                completedTasks: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "done"] }, 1, 0],
                  },
                },
                inProgressTasks: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "in_progress"] },
                      1,
                      0,
                    ],
                  },
                },
                overdueTasks: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$dueDate", now] },
                          { $ne: ["$status", "done"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            {
              $lookup: {
                from: User.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "employee",
              },
            },
            { $unwind: "$employee" },
            {
              $project: {
                _id: 0,
                employeeId: "$employee._id",
                employeeName: "$employee.name",
                totalTasks: 1,
                completedTasks: 1,
                inProgressTasks: 1,
                overdueTasks: 1,
              },
            },
            { $sort: { employeeName: 1 } },
          ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard fetched successfully",
      data: {
        overview: {
          totalUsers,
          totalTeams,
          totalProjects,
          totalTasks,
          todoTasks,
          inProgressTasks,
          inReviewTasks,
          completedTasks,
          overdueTasks,
        },
        tasksByStatus,
        tasksByPriority,
        recentTasks,
        teamPerformance,
      },
    });
  } catch (error) {
    console.error("Get dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};

module.exports = { getDashboard };