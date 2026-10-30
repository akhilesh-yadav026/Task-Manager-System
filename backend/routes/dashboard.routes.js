const express = require("express");
const { getDashboard } = require("../controllers/dashboard.controller.js");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All dashboard endpoints require authentication.
router.get("/", protect, getDashboard);

module.exports = router;