import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import TaskList from "./pages/tasks/TaskList";
import CreateTask from "./pages/tasks/CreateTask";
import TaskDetails from "./pages/tasks/TaskDetails";
import TeamsPage from "./pages/teams/TeamsPage";
import UsersPage from "./pages/admin/UsersPage";
import ProjectsPage from "./pages/projects/ProjectsPage";
import ProjectDetails from "./pages/projects/ProjectDetails";

const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const routes = {
    admin: "/admin/dashboard",
    manager: "/manager/dashboard",
    employee: "/employee/dashboard",
  };

  return <Navigate to={routes[user.role] || "/unauthorized"} replace />;
};

const Unauthorized = () => (
  <div className="flex min-h-screen items-center justify-center p-6">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-slate-900">Access Denied</h1>
      <p className="mt-3 text-slate-500">
        You don't have permission to access this page.
      </p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/teams" element={<TeamsPage />} />
              <Route path="/admin/projects" element={<ProjectsPage />} />
              <Route path="/admin/projects/:projectId" element={<ProjectDetails />} />
              <Route path="/admin/tasks" element={<TaskList />} />
              <Route path="/admin/tasks/new" element={<CreateTask />} />
              <Route
  path="/admin/tasks/:taskId"
  element={<TaskDetails />}
/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/team" element={<TeamsPage />} />
              <Route path="/manager/projects" element={<ProjectsPage />} />
              <Route path="/manager/projects/:projectId" element={<ProjectDetails />} />

              <Route path="/manager/tasks" element={<TaskList />} />
              <Route path="/manager/tasks/new" element={<CreateTask />} />
              <Route path="/manager/tasks/:taskId"element={<TaskDetails />}/>
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["employee"]} />}>
            <Route element={<DashboardLayout />}>
              <Route
                path="/employee/dashboard"
                element={<EmployeeDashboard />}
              />
              <Route path="/employee/tasks" element={<TaskList />} />
              <Route
  path="/employee/tasks/:taskId"
  element={<TaskDetails />}
/>
            </Route>
          </Route>

          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element={<HomeRedirect />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
