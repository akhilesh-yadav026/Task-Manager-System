import {
  CheckSquare,
  Clock,
  FolderKanban,
  ListTodo,
  Users,
  AlertTriangle,
  Eye,
} from "lucide-react";

const icons = {
  users: Users,
  teams: Users,
  projects: FolderKanban,
  tasks: CheckSquare,
  todo: ListTodo,
  inProgress: Clock,
  inReview: Eye,
  completed: CheckSquare,
  overdue: AlertTriangle,
};

const StatCard = ({ title, value = 0, type = "tasks" }) => {
  const Icon = icons[type] || CheckSquare;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-3xl">
            {value ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 sm:p-3">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
