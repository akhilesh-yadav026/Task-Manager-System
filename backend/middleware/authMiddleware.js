
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    // 1. Check whether the token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please log in.",
      });
    }

    // 2. Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find the user associated with the token
    const user = await User.findById(decoded.id).select("_id role team isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists",
      });
    }

    // 4. Prevent inactive users from accessing protected routes
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // 5. Attach authenticated user information to the request
    req.user = {
      id: user._id,
      role: user.role,
      team: user.team,
    };

    // 6. Continue to the next middleware or controller
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  protect
};