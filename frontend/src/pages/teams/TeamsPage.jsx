import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  UserRound,
  X,
  UserPlus,
  UserMinus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  addTeamMember,
  createTeam,
  getTeams,
  removeTeamMember,
  updateTeam,
} from "../../api/teamApi";
import { getUsers } from "../../api/userApi";

const initials = (name = "?") =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const palette = [
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
];

function TeamForm({ managers, onClose, onSave }) {
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave({ name, managerId });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create team.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Create a team</h2>
            <p className="mt-1 text-sm text-slate-500">
              Give your team a name and assign a manager.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <label className="mb-4 block text-sm font-medium text-slate-700">
          Team name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Product design"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
          />
        </label>
        <label className="mb-5 block text-sm font-medium text-slate-700">
          Team manager
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400"
          >
            <option value="">Choose an available manager</option>
            {managers
              .filter((u) => !u.team)
              .map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} · {u.email}
                </option>
              ))}
          </select>
          {managers.filter((u) => !u.team).length === 0 && (
            <span className="mt-1 block text-xs text-amber-600">
              All managers are already assigned to a team.
            </span>
          )}
        </label>
        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            disabled={saving || !managers.some((u) => !u.team)}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create team"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TeamCard({ team, index, isAdmin, employees, onChanged }) {
  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = employees.filter((user) => !user.team);
  const mutate = async (work) => {
    setBusy(true);
    setError("");
    try {
      await work();
      await onChanged();
    } catch (err) {
      setError(
        err.response?.data?.message || "That change could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`h-1.5 ${["bg-violet-400", "bg-amber-400", "bg-sky-400", "bg-rose-400"][index % 4]}`}
      />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${palette[index % palette.length]}`}
            >
              <Users size={21} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">
                {team.name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {team.members?.length || 0} team members
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${team.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
          >
            {team.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              {initials(team.manager?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Team manager
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {team.manager?.name || "Unassigned"}
              </p>
            </div>
            <ShieldCheck size={16} className="text-violet-500" />
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Members{" "}
              <span className="ml-1 text-slate-300">
                {team.members?.length || 0}
              </span>
            </p>
            {isAdmin && team.isActive && available.length > 0 && (
              <span className="text-[11px] text-slate-400">
                Add a teammate below
              </span>
            )}
          </div>
          {team.members?.length ? (
            <div className="space-y-2">
              {team.members.map((member, memberIndex) => (
                <div
                  key={member._id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${palette[(index + memberIndex + 1) % palette.length]}`}
                  >
                    {initials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {member.email}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        mutate(() => removeTeamMember(team._id, member._id))
                      }
                      title={`Remove ${member.name}`}
                      aria-label={`Remove ${member.name}`}
                      className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-sm text-slate-400">
              No members added yet
            </div>
          )}
        </div>
        {isAdmin && team.isActive && (
          <div className="mt-4 flex gap-2">
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-violet-400"
            >
              <option value="">Choose an employee</option>
              {available.map((person) => (
                <option key={person._id} value={person._id}>
                  {person.name}
                </option>
              ))}
            </select>
            <button
              disabled={!memberId || busy}
              onClick={() =>
                mutate(async () => {
                  await addTeamMember(team._id, memberId);
                  setMemberId("");
                })
              }
              title="Add member"
              aria-label="Add selected member"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 transition hover:bg-violet-100 disabled:opacity-40"
            >
              <UserPlus size={17} />
            </button>
          </div>
        )}
        {isAdmin && (
          <button
            disabled={busy}
            onClick={() =>
              mutate(() => updateTeam(team._id, { isActive: !team.isActive }))
            }
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-700"
          >
            {team.isActive ? "Deactivate team" : "Reactivate team"}
          </button>
        )}
        {error && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-rose-600">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamResponse, userResponse] = await Promise.all([
        getTeams(),
        isAdmin ? getUsers() : Promise.resolve({ data: { users: [] } }),
      ]);
      setTeams(teamResponse.data?.teams || []);
      setUsers(userResponse.data?.users || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load teams. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  useEffect(() => {
    load();
  }, [load]);
  const filtered = useMemo(
    () =>
      teams.filter((team) =>
        `${team.name} ${team.manager?.name || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [teams, query],
  );
  const managers = users.filter((item) => item.role === "manager");
  const employees = users.filter((item) => item.role === "employee");
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {isAdmin ? "Workspace directory" : "Your workspace"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "Teams" : "My team"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAdmin
              ? "Build teams, assign managers, and keep everyone connected."
              : "Meet your team and see who's working alongside you."}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
            >
              <Plus size={17} /> New team
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isAdmin ? "Total teams" : "Team status"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading
              ? "—"
              : isAdmin
                ? teams.length
                : teams[0]?.isActive
                  ? "Active"
                  : teams.length
                    ? "Inactive"
                    : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isAdmin ? "Team members" : "People"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading
              ? "—"
              : teams.reduce(
                  (total, team) => total + (team.members?.length || 0),
                  0,
                )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isAdmin ? "Available managers" : "Your role"}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading
              ? "—"
              : isAdmin
                ? managers.filter((manager) => !manager.team).length
                : "Manager"}
          </p>
        </div>
      </div>
      {isAdmin && (
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>
      )}
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
              className="h-80 animate-pulse rounded-2xl bg-slate-200/70"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((team, index) => (
            <TeamCard
              key={team._id}
              team={team}
              index={index}
              isAdmin={isAdmin}
              employees={employees}
              onChanged={load}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <UserRound size={22} />
          </div>
          <h2 className="mt-4 font-bold text-slate-900">
            {isAdmin ? "No teams yet" : "You’re not on a team yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            {isAdmin
              ? "Create a team and assign a manager to get your workspace organized."
              : "Your team will appear here once an admin assigns you."}
          </p>
          {isAdmin && (
            <button
              onClick={() => setModal(true)}
              className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              Create your first team
            </button>
          )}
        </div>
      )}
      {modal && (
        <TeamForm
          managers={managers}
          onClose={() => setModal(false)}
          onSave={createTeam}
        />
      )}
    </div>
  );
}
