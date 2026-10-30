
const mongoose = require("mongoose");

const checkTeamAccess = (req, res, next) => {
  try {
    const { teamId } = req.params;

    // Ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Admins can access any team's resources
    if (req.user.role === "admin") {
      return next();
    }

    // Check whether teamId was provided
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    // Check whether the user belongs to this team
    if (
      !req.user.team ||
      req.user.team.toString() !== teamId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not belong to this team.",
      });
    }

    next();
  } catch (error) {
    console.error("Team access error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = checkTeamAccess;
