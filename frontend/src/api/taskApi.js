import api from "./axios";

export const getTasks = async (params = {}) => {
  const response = await api.get("/tasks", { params });
  return response.data;
};

export const exportTasksCsv = async (params = {}) =>
  api.get("/tasks/export/csv", { params, responseType: "blob" });

export const getTaskById = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}`);
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await api.post("/tasks", taskData);
  return response.data;
};

export const updateTask = async (taskId, taskData) => {
  const response = await api.put(`/tasks/${taskId}`, taskData);
  return response.data;
};

export const updateTaskStatus = async (taskId, payload) => {
  const response = await api.patch(
    `/tasks/${taskId}/status`,
    payload
  );

  return response.data;
};


export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};


export const getTaskComments = async (taskId) => {
  const response = await api.get(
    `/tasks/${taskId}/comments`
  );

  return response.data;
};

export const createTaskComment = async (taskId, message) => {
  const response = await api.post(
    `/tasks/${taskId}/comments`,
    { message }
  );

  return response.data;
};

export const getTaskActivities = async (taskId) => {
  const response = await api.get(
    `/tasks/${taskId}/activities`
  );

  return response.data;
};
