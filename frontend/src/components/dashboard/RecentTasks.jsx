const statusStyles = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  in_review: "bg-amber-50 text-amber-700",
  done: "bg-emerald-50 text-emerald-700",
};

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Completed",
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const RecentTasks = ({ tasks = [] }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900">
          Recent Tasks
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Recently created tasks in your workspace
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-medium text-slate-700">
            No tasks found
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Tasks will appear here when available.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Task</th>
                <th className="px-5 py-4 font-semibold">Assignee</th>
                <th className="px-5 py-4 font-semibold">Priority</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Due Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr key={task._id} className="hover:bg-slate-50">
                  <td className="max-w-64 px-5 py-4">
                    <p className="truncate font-medium text-slate-900">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.project?.name || "No project"}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {task.assignee?.name || "Unassigned"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="capitalize text-slate-600">
                      {task.priority || "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                        statusStyles[task.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {statusLabels[task.status] || task.status}
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
      )}
    </div>
  );
};

export default RecentTasks;