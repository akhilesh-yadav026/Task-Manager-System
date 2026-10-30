
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Download,
} from "lucide-react";

import { exportTasksCsv as requestTasksCsv, getTasks } from "../../api/taskApi";
import { useAuth } from "../../context/AuthContext";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusStyles = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  in_review: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-red-50 text-red-700",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const TaskList = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const canManageTasks = isAdmin || isManager;
  const taskBasePath = isManager ? "/manager/tasks" : "/admin/tasks";

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(async (page, activeFilters) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: pagination.limit,
      };

      if (activeFilters.search.trim()) {
        params.search = activeFilters.search.trim();
      }

      if (activeFilters.status) {
        params.status = activeFilters.status;
      }

      if (activeFilters.priority) {
        params.priority = activeFilters.priority;
      }

      const response = await getTasks(params);

      if (!response.success) {
        throw new Error(response.message || "Failed to fetch tasks");
      }

      setTasks(Array.isArray(response.data) ? response.data : []);

      setPagination((previous) => ({
        ...previous,
        ...(response.pagination || {}),
      }));
    } catch (err) {
      setTasks([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load tasks"
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((previous) => ({
        ...previous,
        search: searchInput,
      }));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadTasks(1, filters);
  }, [filters, loadTasks]);

  const changeFilter = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const changePage = (newPage) => {
    if (
      newPage < 1 ||
      newPage > pagination.totalPages ||
      newPage === pagination.page
    ) {
      return;
    }

    setPagination((previous) => ({
      ...previous,
      page: newPage,
    }));

    loadTasks(newPage, filters);
  };

  const exportTasks = async () => {
    setExporting(true);
    setExportError("");

    try {
      const params = { page: 1, limit: 100 };
      const search = searchInput.trim();

      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;

      const response = await requestTasksCsv(params);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      let message = err.message || "Unable to export tasks.";
      if (err.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await err.response.data.text());
          message = payload.message || message;
        } catch {
          // Use the request error when the response isn't JSON.
        }
      } else {
        message = err.response?.data?.message || message;
      }
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  const startIndex =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;

  const endIndex = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Tasks
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage tasks, track progress, and monitor deadlines.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportTasks}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          {canManageTasks && (
            <Link
              to={`${taskBasePath}/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Task
            </Link>
          )}
        </div>
      </div>

      {exportError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              placeholder="Search tasks..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={filters.status}
            onChange={(event) =>
              changeFilter("status", event.target.value)
            }
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>

            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(event) =>
              changeFilter("priority", event.target.value)
            }
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>

            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
              <p className="mt-3 text-sm text-slate-500">
                Loading tasks...
              </p>
            </div>
          </div>
        ) : !error && tasks.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-semibold text-slate-800">
              No tasks found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Task</th>
                  <th className="px-5 py-4 font-semibold">Project / Team</th>
                  <th className="px-5 py-4 font-semibold">Assignee</th>
                  <th className="px-5 py-4 font-semibold">Priority</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Due Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr
                    key={task._id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="max-w-72 px-5 py-4">
                      <Link
                        to={`/${user.role}/tasks/${task._id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600"
                      >
                        {task.title}
                      </Link>

                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {task.description || "No description"}
                      </p>

                      {task.isOverdue && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertTriangle size={13} />
                          Overdue
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {task.project?.name || "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.team?.name || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {task.assignee?.name || "Unassigned"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.assignee?.email || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          priorityStyles[task.priority] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {task.priority || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[task.status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_OPTIONS.find(
                          (option) => option.value === task.status
                        )?.label || task.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-500">
            Showing {startIndex}–{endIndex} of {pagination.total} tasks
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={loading || pagination.page <= 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm font-medium text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={
                loading ||
                pagination.page >= pagination.totalPages
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
