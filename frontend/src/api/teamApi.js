import api from "./axios";

export const getTeams = async () => (
  await api.get("/teams")
).data;
export const createTeam = async (payload) => (await api.post("/teams", payload)).data;
export const updateTeam = async (teamId, payload) => (await api.put(`/teams/${teamId}`, payload)).data;
export const addTeamMember = async (teamId, userId) =>
  (await api.post(`/teams/${teamId}/members`, { userId })).data;
export const removeTeamMember = async (teamId, userId) =>
  (await api.delete(`/teams/${teamId}/members/${userId}`)).data;
