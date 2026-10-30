import { useCallback, useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  CheckCircle2,
  Circle,
  Clock,
  UserRound,
} from "lucide-react";

import { getTaskActivities } from "../../api/taskApi";

const getActor = (activity) => {
  return (
    activity.userId ||
    activity.user ||
    activity.createdBy ||
    null
  );
};

const getActorName = (activity) => {
  const actor = getActor(activity);

  if (!actor) return "Unknown user";

  if (typeof actor === "string") return "User";

  return actor.name || actor.email || "Unknown user";
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatus = (status) => {
  if (!status) return "";

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const formatFieldName = (field) => {
  if (!field) return "details";

  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .toLowerCase();
};

const formatValue = (field, value) => {
  if (value === null || value === undefined || value === "") {
    return "empty";
  }

  if (field === "status") {
    return formatStatus(String(value));
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const getActivityDescription = (activity) => {
  const action = String(activity.action || "").toUpperCase();

  const changes = Array.isArray(activity.changes)
    ? activity.changes
    : [];

  if (action === "STATUS_CHANGED") {
    const statusChange = changes.find(
      (change) => change.field === "status"
    );

    if (statusChange) {
      return `changed status from ${formatStatus(
        statusChange.previousValue
      )} to ${formatStatus(statusChange.newValue)}`;
    }

    return "updated the task status";
  }

  const actionDescriptions = {
    TASK_CREATED: "created the task",
    TASK_UPDATED: "updated the task",
    TASK_ASSIGNED: "changed the task assignment",
    COMMENT_ADDED: "added a comment",
    TASK_DELETED: "deleted the task",
  };

  if (actionDescriptions[action]) {
    return actionDescriptions[action];
  }

  if (changes.length > 0) {
    return `updated ${changes
      .map((change) => formatFieldName(change.field))
      .join(", ")}`;
  }

  return action
    ? action.replace(/_/g, " ").toLowerCase()
    : "performed an action";
};

const TaskActivity = ({ taskId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivities = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError("");

      const response = await getTaskActivities(taskId);

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to load activity history"
        );
      }

      setActivities(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load activity history."
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ActivityIcon size={20} />
            Activity History

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-600">
              {activities.length}
            </span>
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track changes and actions performed on this task.
          </p>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Activity list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Loading activity history...
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <Clock
            size={28}
            className="mx-auto mb-2 text-slate-400"
          />

          <p className="font-medium text-slate-700">
            No activity yet
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Changes to this task will appear here when recorded.
          </p>
        </div>
      ) : (
        <div className="relative space-y-6">
          {activities.map((activity, index) => {
            const changes = Array.isArray(activity.changes)
              ? activity.changes
              : [];

            const actorName = getActorName(activity);

            return (
              <article
                key={activity._id || `${activity.action}-${index}`}
                className="relative flex gap-3"
              >
                {/* Timeline icon */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  {String(activity.action).toUpperCase() ===
                  "STATUS_CHANGED" ? (
                    <CheckCircle2 size={19} />
                  ) : (
                    <Circle size={19} />
                  )}
                </div>

                {/* Activity details */}
                <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRound
                      size={15}
                      className="text-slate-500"
                    />

                    <span className="font-semibold text-slate-900">
                      {actorName}
                    </span>
                  </div>

                  <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                    {getActivityDescription(activity)}
                  </p>

                  {/* Field-level changes */}
                  {changes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {changes.map((change, changeIndex) => (
                        <div
                          key={`${change.field}-${changeIndex}`}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                        >
                          <p className="font-medium capitalize text-slate-600">
                            {formatFieldName(change.field)}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-500">
                            <span>
                              {formatValue(
                                change.field,
                                change.previousValue
                              )}
                            </span>

                            <span aria-hidden="true">→</span>

                            <span className="font-medium text-slate-800">
                              {formatValue(
                                change.field,
                                change.newValue
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional reason */}
                  {activity.reason && (
                    <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                      <p className="text-xs font-semibold text-amber-800">
                        Reason
                      </p>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-900">
                        {activity.reason}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-slate-500">
                    {formatDate(activity.createdAt)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TaskActivity;
