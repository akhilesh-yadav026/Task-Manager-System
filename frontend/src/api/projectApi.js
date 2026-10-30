import api from "./axios";

export const getProjects = async (params = {}) => (await api.get("/projects", { params })).data;
export const getProject = async (projectId) => (await api.get(`/projects/${projectId}`)).data;
export const createProject = async (payload) => (await api.post("/projects", payload)).data;
export const updateProjectStatus = async (projectId, status) =>
  (await api.patch(`/projects/${projectId}/status`, { status })).data;
