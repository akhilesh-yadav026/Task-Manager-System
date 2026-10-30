import { useEffect, useState } from "react";

import { getDashboardData } from "../../api/dashboardApi";
import StatCard from "./StateCard";
import TaskStatusChart from "./TaskStatusChart";
import PriorityChart from "./PriorityChart";
import RecentTasks from "./RecentTasks";
import { useAuth } from "../../context/AuthContext";

const DashboardHome = ({ role }) => {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getDashboardData();

      if (!response.success) {
        throw new Error(
          response.message || "Could not load dashboard"
        );
      }

      setDashboard(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const overview = dashboard?.overview || {};

  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const title = {
    admin: "Admin Dashboard",
    manager: "Manager Dashboard",
    employee: "My Dashboard",
  }[role];

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
        <h2 className="font-semibold text-red-700">
          Unable to load dashboard
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {error}
        </p>

      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {title}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Welcome, {user?.name || "User"}. Here's your latest overview.
          </p>
        </div>

      </div>

      {/* Overview cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Overview
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {isAdmin && (
            <>
              <StatCard title="Total Users" value={overview.totalUsers} type="users" />
              <StatCard title="Total Teams" value={overview.totalTeams} type="teams" />
              <StatCard title="Total Projects" value={overview.totalProjects} type="projects" />
            </>
          )}

          {isManager && (
            <>
              <StatCard title="Team Members" value={overview.totalUsers} type="users" />
              <StatCard title="Team Projects" value={overview.totalProjects} type="projects" />
            </>
          )}

          <StatCard title="Total Tasks" value={overview.totalTasks} type="tasks" />
          <StatCard title="To Do" value={overview.todoTasks} type="todo" />
          <StatCard title="In Progress" value={overview.inProgressTasks} type="inProgress" />
          <StatCard title="In Review" value={overview.inReviewTasks} type="inReview" />
          <StatCard title="Completed" value={overview.completedTasks} type="completed" />
          <StatCard title="Overdue" value={overview.overdueTasks} type="overdue" />
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TaskStatusChart data={dashboard?.tasksByStatus || []} />
        <PriorityChart data={dashboard?.tasksByPriority || []} />
      </section>

      {/* Recent tasks */}
      <section>
        <RecentTasks tasks={dashboard?.recentTasks || []} />
      </section>

      {/* Team performance */}
      {(isAdmin || isManager) && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900">
              Team Performance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Task completion and outstanding workload by employee
            </p>
          </div>

          {!dashboard?.teamPerformance?.length ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No team performance data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Total Tasks</th>
                    <th className="px-5 py-4">Completed</th>
                    <th className="px-5 py-4">In Progress</th>
                    <th className="px-5 py-4">Overdue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {dashboard.teamPerformance.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {employee.employeeName}
                      </td>
                      <td className="px-5 py-4">{employee.totalTasks}</td>
                      <td className="px-5 py-4 text-emerald-700">
                        {employee.completedTasks}
                      </td>
                      <td className="px-5 py-4">
                        {employee.inProgressTasks}
                      </td>
                      <td className="px-5 py-4 text-red-600">
                        {employee.overdueTasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default DashboardHome;
