const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // Check whether the user's role is permitted
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to perform this action.",
      });
    }

    // User is authorized
    next();
  };
};

module.exports = authorizeRoles;