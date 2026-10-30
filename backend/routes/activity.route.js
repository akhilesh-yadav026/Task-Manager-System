const express = require("express");

const {
  getTaskActivities,
} = require("../controllers/activity.controller.js");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router({ mergeParams: true });

router.use(protect);

router.get("/", getTaskActivities);

module.exports = router;