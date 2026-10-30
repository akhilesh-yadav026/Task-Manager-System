import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarDays,
  Plus,
  Search,
  ArrowUpRight,
  X,
} from "lucide-react";
import { createProject, getProjects } from "../../api/projectApi";
import { getTeams } from "../../api/teamApi";
import { useAuth } from "../../context/AuthContext";

const statuses = {
  planning: "bg-violet-50 text-violet-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-sky-50 text-sky-700",
  on_hold: "bg-amber-50 text-amber-700",
};
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function ProjectForm({ teams, manager, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    description: "",
    teamId: manager ? teams[0]?._id || "" : "",
    startDate: "",
    endDate: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (manager) delete payload.teamId;
      await createProject(payload);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create project.");
    } finally {
      setSaving(false);
    }
  };
  const field =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create project</h2>
            <p className="mt-1 text-sm text-slate-500">
              Set up a project for your {manager ? "team" : "workspace"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Project name
            <input
              name="name"
              value={form.name}
              onChange={change}
              required
              className={field}
              placeholder="e.g. Website redesign"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Client
            <input
              name="clientName"
              value={form.clientName}
              onChange={change}
              required
              className={field}
              placeholder="Client or department"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={change}
              rows="3"
              className={field}
              placeholder="What is this project about?"
            />
          </label>
          {!manager && (
            <label className="block text-sm font-medium text-slate-700">
              Team
              <select
                name="teamId"
                value={form.teamId}
                onChange={change}
                required
                className={field}
              >
                <option value="">Choose a team</option>
                {teams
                  .filter((team) => team.isActive)
                  .map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Start date
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={change}
                required
                className={field}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              End date
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={change}
                required
                className={field}
              />
            </label>
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            disabled={
              saving || (!manager && !teams.some((team) => team.isActive))
            }
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [projectResponse, teamResponse] = await Promise.all([
        getProjects({ limit: 100 }),
        getTeams(),
      ]);
      setProjects(
        Array.isArray(projectResponse.data) ? projectResponse.data : [],
      );
      setTeams(teamResponse.data?.teams || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const filtered = projects.filter(
    (project) =>
      `${project.name} ${project.clientName} ${project.team?.name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || project.status === status),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {isAdmin ? "Workspace overview" : "Your team workspace"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAdmin
              ? "Keep every team project moving in one place."
              : "Track the work and progress across your team."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={17} /> New project
          </button>
        </div>
      </div>
    
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-56 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project, index) => (
            <Link
              key={project._id}
              to={`/${user.role}/projects/${project._id}`}
              className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl ${["bg-violet-50 text-violet-700", "bg-sky-50 text-sky-700", "bg-amber-50 text-amber-700"][index % 3]}`}
                >
                  <BriefcaseBusiness size={20} />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statuses[project.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {project.status?.replace("_", " ")}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-violet-700">
                {project.name}
                <ArrowUpRight
                  size={15}
                  className="ml-1 inline-block opacity-0 transition group-hover:opacity-100"
                />
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {project.clientName}{" "}
                <span className="mx-1 text-slate-300">·</span>{" "}
                {project.team?.name || "Team"}
              </p>
              <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                {project.description ||
                  "No project description has been added."}
              </p>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                <CalendarDays size={14} />
                <span>
                  {formatDate(project.startDate)} –{" "}
                  {formatDate(project.endDate)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <BriefcaseBusiness size={22} />
          </div>
          <h2 className="mt-4 font-bold text-slate-900">No projects found</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create a project for your team to start tracking work.
          </p>
          <button
            onClick={() => setModal(true)}
            className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create project
          </button>
        </div>
      )}
      {modal && (
        <ProjectForm
          teams={teams}
          manager={!isAdmin}
          onClose={() => setModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
