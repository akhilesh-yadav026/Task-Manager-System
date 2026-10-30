const Team = require("../models/team.model.js");

const getId = (value) => value?._id || value?.id || value;

const canManageTeam = async (user, teamId) => {
  const normalizedTeamId = getId(teamId);

  if (!normalizedTeamId || !user?.id) {
    return false;
  }

  const team = await Team.findById(normalizedTeamId).select("manager isActive");

  return Boolean(
    team &&
      team.isActive &&
      getId(team.manager)?.toString() === getId(user.id)?.toString(),
  );
};

const canAccessTask = async (user, task) => {
  const assigneeId = getId(task.assignee);
  const teamId = getId(task.team);

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "employee") {
    return assigneeId?.toString() === getId(user.id)?.toString();
  }

  if (
    user.role === "manager" &&
    user.team &&
    teamId?.toString() === getId(user.team)?.toString()
  ) {
    return canManageTeam(user, teamId);
  }

  return false;
};

module.exports = { canAccessTask };
