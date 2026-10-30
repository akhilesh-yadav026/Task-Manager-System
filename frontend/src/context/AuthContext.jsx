import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loginUser,
  logoutUser,
  getCurrentUser,
} from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session when the application loads.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await getCurrentUser();

        setUser(response.data?.user ?? response.data ?? null);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login
  const login = async (credentials) => {
    const response = await loginUser(credentials);

    // Support common response shapes.
    const loggedInUser =
      response.data?.user ??
      response.user ??
      null;

    if (!loggedInUser) {
      // The cookie may have been set, but the user response
      // may have a different structure. Check the backend response.
      throw new Error(
        "User data was not found in the login response."
      );
    }

    setUser(loggedInUser);

    return loggedInUser;
  };

  // Logout
  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};