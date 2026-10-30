import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock3,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import { getProject, updateProjectStatus } from "../../api/projectApi";
import { getTasks } from "../../api/taskApi";
import { useAuth } from "../../context/AuthContext";

const statusNames = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  on_hold: "On hold",
};
const taskStatus = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Completed",
};
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectResponse, taskResponse] = await Promise.all([
        getProject(projectId),
        getTasks({ projectId, limit: 100 }),
      ]);
      setProject(projectResponse.data);
      setTasks(Array.isArray(taskResponse.data) ? taskResponse.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  useEffect(() => {
    load();
  }, [load]);
  const changeStatus = async (status) => {
    setSaving(true);
    setError("");
    try {
      const response = await updateProjectStatus(projectId, status);
      setProject(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update project status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const taskPath = `/${user?.role}/tasks`;
  if (loading)
    return (
      <div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center gap-3 text-slate-500">
        <RefreshCw size={18} className="animate-spin" />
        Loading project…
      </div>
    );
  if (error && !project)
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-8 text-center">
        <p className="font-semibold text-rose-700">{error}</p>
        <Link
          to={`/${user?.role}/projects`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-700"
        >
          <ArrowLeft size={15} /> Back to projects
        </Link>
      </div>
    );
  const completed = tasks.filter((task) => task.status === "done").length;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        to={`/${user?.role}/projects`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"
      >
        <ArrowLeft size={16} /> All projects
      </Link>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
              {project.team?.name || "Team project"} · {project.clientName}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {project.description || "No project description has been added."}
            </p>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Project status
            <select
              disabled={saving}
              value={project.status}
              onChange={(event) => changeStatus(event.target.value)}
              className="mt-2 block rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold capitalize text-slate-700 outline-none focus:border-violet-400 disabled:opacity-50"
            >
              {Object.entries(statusNames).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-7 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Timeline
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {date(project.startDate)} – {date(project.endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <ListTodo size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Tasks
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {tasks.length} total · {completed} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Progress
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {tasks.length
                  ? Math.round((completed / tasks.length) * 100)
                  : 0}
                % complete
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Project tasks</h2>
            <p className="mt-1 text-xs text-slate-400">
              Work assigned to this project
            </p>
          </div>
          <Link
            to={`${taskPath}/new`}
            className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-700"
          >
            Create task
          </Link>
        </div>
        {tasks.length ? (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <Link
                key={task._id}
                to={`${taskPath}/${task._id}`}
                className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-xl ${task.status === "done" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                >
                  {task.status === "done" ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <CircleDashed size={17} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {task.assignee?.name || "Unassigned"}
                    {task.dueDate ? ` · Due ${date(task.dueDate)}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <Clock3 size={12} />
                  {taskStatus[task.status] || task.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <ListTodo size={24} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800">
              No tasks in this project yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create the first task to get the project moving.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
