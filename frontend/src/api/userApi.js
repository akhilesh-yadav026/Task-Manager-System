import api from "./axios";

export const getUsers = async () => (await api.get("/user")).data;
