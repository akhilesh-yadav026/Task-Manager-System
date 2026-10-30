import api from "./axios";

export const loginUser = async (credentials) => {
  const response = await api.post("/user/login", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/user/logout");
  return response.data;
};

export const getCurrentUser = async () => { 
  const response = await api.get("/user/me");
  return response.data;
};