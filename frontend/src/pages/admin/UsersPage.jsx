import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Users,
  ShieldCheck,
  BriefcaseBusiness,
  UserRound,
  Mail,
} from "lucide-react";
import { getUsers } from "../../api/userApi";

const roleStyle = {
  admin: "bg-violet-50 text-violet-700",
  manager: "bg-sky-50 text-sky-700",
  employee: "bg-amber-50 text-amber-700",
};
const initials = (name = "?") =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getUsers();
      setUsers(response.data?.users || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load users. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const filtered = useMemo(
    () =>
      users.filter((person) => {
        const matchesQuery =
          `${person.name} ${person.email} ${person.team?.name || ""}`
            .toLowerCase()
            .includes(query.toLowerCase());
        return (
          matchesQuery &&
          (role === "all" || person.role === role) &&
          (status === "all" ||
            (status === "active" ? person.isActive : !person.isActive))
        );
      }),
    [users, query, role, status],
  );
  const count = (filter) => users.filter(filter).length;
  const stats = [
    {
      label: "All users",
      value: users.length,
      icon: Users,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Admins",
      value: count((person) => person.role === "admin"),
      icon: ShieldCheck,
      color: "bg-rose-50 text-rose-600",
    },
    {
      label: "Managers",
      value: count((person) => person.role === "manager"),
      icon: BriefcaseBusiness,
      color: "bg-sky-50 text-sky-600",
    },
    {
      label: "Employees",
      value: count((person) => person.role === "employee"),
      icon: UserRound,
      color: "bg-amber-50 text-amber-600",
    },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Workspace directory
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            A clear view of everyone in your workspace and the role they play.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30"
          >
            <div
              className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}
            >
              <Icon size={19} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {label}
              </p>
              <p className="mt-0.5 text-2xl font-bold text-slate-900">
                {loading ? "—" : value}
              </p>
            </div>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        {error && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Person</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Team</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((person, index) => (
                  <tr
                    key={person._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${["bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"][index % 4]}`}
                        >
                          {initials(person.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {person.name}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail size={12} />
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleStyle[person.role] || "bg-slate-100 text-slate-600"}`}
                      >
                        {person.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {person.team?.name || (
                        <span className="text-slate-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${person.isActive ? "text-emerald-700" : "text-slate-400"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${person.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                        {person.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {person.createdAt
                        ? new Date(person.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
              Showing {filtered.length} of {users.length} users
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
              <Users size={22} />
            </div>
            <h2 className="mt-4 font-bold text-slate-800">No users found</h2>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search or filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
