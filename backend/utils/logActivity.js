const Activity = require("../models/activity.model");

const logActivity = async ({
  taskId,
  userId,
  action,
  changes = [],
  reason = "",
}) => {
  return Activity.create({
    task: taskId,
    user: userId,
    action,
    changes,
    reason,
  });
};

module.exports = logActivity;