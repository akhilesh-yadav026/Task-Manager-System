import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LoaderCircle, Plus } from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const initialForm = {
  title: "",
  description: "",
  project: "",
  team: "",
  assignee: "",
  priority: "medium",
  dueDate: "",
};

const getArray = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  // Supports APIs that return { data: { projects: [...] } }
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.teams)) return data.teams;
  if (Array.isArray(data?.members)) return data.members;

  return [];
};

export default function CreateTask() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const taskListPath =
    user?.role === "manager" ? "/manager/tasks" : "/admin/tasks";

  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load projects and teams
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const [projectResponse, teamResponse] = await Promise.all([
          api.get("/projects"),
          api.get("/teams"),
        ]);

        setProjects(getArray(projectResponse.data));
        setTeams(getArray(teamResponse.data));
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load projects and teams."
        );
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, []);

  // Update form fields
  const handleChange = (event) => {
    const { name, value } = event.target;

    setError("");
    setSuccess("");

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Load employees when a team is selected
  const handleTeamChange = async (event) => {
    const teamId = event.target.value;

    setForm((previous) => ({
      ...previous,
      team: teamId,
      assignee: "",
    }));

    setEmployees([]);
    setError("");
    setSuccess("");

    if (!teamId) return;

    try {
      setLoadingEmployees(true);

      const response = await api.get(`/teams/${teamId}`);
      const team = response.data?.data.team;

      // Supports members populated directly on the team.
      const members = team?.members;

      if (Array.isArray(members)) {
        setEmployees(
          members.filter(
            (member) =>
              member &&
              typeof member === "object" &&
              (member._id || member.id)
          )
        );
      } else {
        setError(
          "Team details loaded, but its members were not included. Check your GET /api/teams/:id response."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load team members. Check the team details API."
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Submit task
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.title.trim() ||
      !form.project ||
      !form.team ||
      !form.assignee ||
      !form.dueDate
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        projectId: form.project,
        team: form.team,
        assigneeId: form.assignee,
        priority: form.priority,
        dueDate: new Date(form.dueDate).toISOString(),
      };

      const response = await api.post("/tasks", payload);

      setSuccess(
        response.data?.message || "Task created successfully."
      );

      setTimeout(() => {
        navigate(taskListPath);
      }, 700);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create the task."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  const labelClass = "text-sm font-medium text-gray-700";

  if (loadingOptions) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-gray-600">
        <LoaderCircle className="animate-spin" size={22} />
        Loading projects and teams...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Task
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a task and assign it to a team member.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
      >
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Task Title <span className="text-red-500">*</span>
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Implement user authentication"
              maxLength={150}
              required
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe what needs to be completed..."
              rows={4}
              maxLength={5000}
              className={inputClass}
            />
          </div>

          {/* Project and Team */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="project" className={labelClass}>
                Project <span className="text-red-500">*</span>
              </label>

              <select
                id="project"
                name="project"
                value={form.project}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Select a project</option>

                {projects.map((project) => (
                  <option
                    key={project._id || project.id}
                    value={project._id || project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="team" className={labelClass}>
                Team <span className="text-red-500">*</span>
              </label>

              <select
                id="team"
                name="team"
                value={form.team}
                onChange={handleTeamChange}
                required
                className={inputClass}
              >
                <option value="">Select a team</option>

                {teams.map((team) => (
                  <option
                    key={team._id || team.id}
                    value={team._id || team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee and Priority */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="assignee" className={labelClass}>
                Assign Employee{" "}
                <span className="text-red-500">*</span>
              </label>

              <select
                id="assignee"
                name="assignee"
                value={form.assignee}
                onChange={handleChange}
                required
                disabled={!form.team || loadingEmployees}
                className={inputClass}
              >
                <option value="">
                  {loadingEmployees
                    ? "Loading employees..."
                    : !form.team
                      ? "Select a team first"
                      : "Select an employee"}
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee._id || employee.id}
                    value={employee._id || employee.id}
                  >
                    {employee.name || employee.email}
                  </option>
                ))}
              </select>

              {form.team && !loadingEmployees && employees.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No team members were returned by the API.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="priority" className={labelClass}>
                Priority
              </label>

              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="dueDate" className={labelClass}>
              Due Date <span className="text-red-500">*</span>
            </label>

            <input
              id="dueDate"
              name="dueDate"
              type="datetime-local"
              value={form.dueDate}
              onChange={handleChange}
              min={new Date().toISOString().slice(0, 16)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || loadingEmployees}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Create Task
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
