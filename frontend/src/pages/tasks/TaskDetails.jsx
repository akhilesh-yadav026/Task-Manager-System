
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  UserRound,
  FolderKanban,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Check,
  RotateCcw,
  ClipboardList,
} from "lucide-react";

import {
  getTaskById,
  updateTaskStatus,
} from "../../api/taskApi";

import { useAuth } from "../../context/AuthContext";
import TaskComments from "../tasks/TaskComment";
import TaskActivity from "./TaskActivity";

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Completed",
};

const priorityStyles = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusStyles = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-700",
};

const getTaskFromResponse = (response) => {
  const data = response?.data;

  if (data?.task) {
    return data.task;
  }

  if (data?._id) {
    return data;
  }

  return null;
};

const formatDate = (date) => {
  if (!date) {
    return "Not specified";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDisplayName = (value) => {
  if (!value) {
    return "Not assigned";
  }

  if (typeof value === "string") {
    return value;
  }

  return value.name || value.email || "Not assigned";
};

export default function TaskDetails() {
  const { taskId, id } = useParams();
  const currentTaskId = taskId || id;

  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [reworkReason, setReworkReason] = useState("");

  // Load task details
  const loadTask = useCallback(async () => {
    if (!currentTaskId) {
      setError("Task ID is missing.");
      setTask(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getTaskById(currentTaskId);
      const taskData = getTaskFromResponse(response);

      if (!taskData) {
        setError("Task details were not found in the API response.");
        setTask(null);
        return;
      }

      setTask(taskData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load task details."
      );

      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [currentTaskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Back navigation path based on the user's role
  const taskListPath =
    user?.role === "admin"
      ? "/admin/tasks"
      : user?.role === "manager"
        ? "/manager/tasks"
        : "/employee/tasks";

  // Update task status
  const handleStatusUpdate = async (newStatus) => {
    if (!task || updatingStatus) {
      return;
    }

    setStatusError("");
    setStatusSuccess("");

    const needsReason =
      task.status === "in_review" &&
      newStatus === "in_progress";

    if (needsReason && !reworkReason.trim()) {
      setStatusError(
        "Please provide a reason before returning the task for rework."
      );
      return;
    }

    try {
      setUpdatingStatus(true);

      const payload = {
        status: newStatus,
      };

      if (needsReason) {
        payload.reason = reworkReason.trim();
      }

      const response = await updateTaskStatus(task._id, payload);

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to update task status."
        );
      }

      setStatusSuccess(
        response.message || "Task status updated successfully."
      );

      setReworkReason("");

      // Reload details so the UI reflects the saved status.
      await loadTask();
    } catch (err) {
      setStatusError(
        err.response?.data?.message ||
          err.message ||
          "Failed to update task status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading task details...
        </div>
      </div>
    );
  }

  // Task loading error
  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => navigate(taskListPath)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Tasks
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 text-red-600" />

            <div>
              <h2 className="font-semibold text-red-800">
                Unable to load task
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

              <button
                onClick={loadTask}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";

  const isReviewable = isAdmin || isManager;

  // Employee status actions
  const canStartTask =
    isEmployee && task.status === "todo";

  const canSubmitForReview =
    isEmployee && task.status === "in_progress";

  // Admin and manager review actions
  const canApproveTask =
    isReviewable && task.status === "in_review";

  const canReturnForRework =
    isReviewable && task.status === "in_review";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate(taskListPath)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Tasks
        </button>

      </div>

      {/* Main task information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500">
              Task Details
            </p>

            <h1 className="mt-2 break-words text-2xl font-bold text-gray-900 md:text-3xl">
              {task.title}
            </h1>
          </div>

          {task.status === "done" && (
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              statusStyles[task.status] ||
              "bg-gray-100 text-gray-700"
            }`}
          >
            {statusLabels[task.status] || task.status}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              priorityStyles[task.priority] ||
              "bg-gray-100 text-gray-700"
            }`}
          >
            {task.priority
              ? `${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)} Priority`
              : "Priority not specified"}
          </span>

          {task.isOverdue && task.status !== "done" && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Overdue
            </span>
          )}
        </div>

        <div className="mt-7 border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900">
            Description
          </h2>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {task.description || "No description provided."}
          </p>
        </div>
      </section>

      {/* Task status controls */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <ClipboardList size={20} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Task Workflow
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current status:{" "}
              {statusLabels[task.status] || task.status}
            </p>
          </div>
        </div>

        {/* Error message */}
        {statusError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{statusError}</p>
          </div>
        )}

        {/* Success message */}
        {statusSuccess && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{statusSuccess}</p>
          </div>
        )}

        {/* Employee actions */}
        {canStartTask && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-gray-600">
              Start working on this task when you're ready.
            </p>

            <StatusButton
              icon={<Clock size={16} />}
              label="Start Task"
              disabled={updatingStatus}
              onClick={() =>
                handleStatusUpdate("in_progress")
              }
            />
          </div>
        )}

        {canSubmitForReview && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-gray-600">
              When your work is complete, submit this task
              for manager review.
            </p>

            <StatusButton
              icon={<Send size={16} />}
              label="Submit for Review"
              disabled={updatingStatus}
              onClick={() =>
                handleStatusUpdate("in_review")
              }
            />
          </div>
        )}

        {/* Manager and admin review actions */}
        {canApproveTask && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
              This task is waiting for review.
            </div>

            <StatusButton
              icon={<Check size={16} />}
              label="Approve and Complete"
              disabled={updatingStatus}
              onClick={() => handleStatusUpdate("done")}
            />

            <div>
              <label
                htmlFor="reworkReason"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Reason for returning the task
              </label>

              <textarea
                id="reworkReason"
                value={reworkReason}
                onChange={(event) =>
                  setReworkReason(event.target.value)
                }
                placeholder="Explain what needs to be corrected..."
                rows={3}
                disabled={updatingStatus}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                onClick={() =>
                  handleStatusUpdate("in_progress")
                }
                disabled={
                  updatingStatus || !reworkReason.trim()
                }
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Return for Rework
              </button>
            </div>
          </div>
        )}

        {/* Admin can set any status */}
        {isAdmin && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Admin Status Override
            </h3>

            <p className="mb-3 text-sm text-gray-500">
              Administrators can directly set any task status.
            </p>

            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(
                ([status, label]) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      updatingStatus || task.status === status
                    }
                    onClick={() => {
                      if (
                        task.status === "in_review" &&
                        status === "in_progress"
                      ) {
                        // The reason is collected in the review section.
                        handleStatusUpdate(status);
                        return;
                      }

                      handleStatusUpdate(status);
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      task.status === status
                        ? "border-gray-200 bg-gray-100 text-gray-400"
                        : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Completed state */}
        {task.status === "done" && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} />
            This task has been completed.
          </div>
        )}

        {/* No employee action available */}
        {isEmployee &&
          !canStartTask &&
          !canSubmitForReview && (
            <p className="mt-5 text-sm text-gray-500">
              {task.status === "in_review"
                ? "Your task is waiting for review."
                : task.status === "done"
                  ? "This task is completed."
                  : "No status actions are available for this task."}
            </p>
          )}

        {updatingStatus && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw size={16} className="animate-spin" />
            Updating task status...
          </div>
        )}
      </section>

      {/* Assignment information */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-semibold text-gray-900">
          Assignment Information
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <InfoItem
            icon={<FolderKanban size={19} />}
            label="Project"
            value={getDisplayName(task.project)}
          />

          <InfoItem
            icon={<Users size={19} />}
            label="Team"
            value={getDisplayName(task.team)}
          />

          <InfoItem
            icon={<UserRound size={19} />}
            label="Assigned To"
            value={getDisplayName(task.assignee)}
          />

          <InfoItem
            icon={<UserRound size={19} />}
            label="Created By"
            value={getDisplayName(task.createdBy)}
          />

          <InfoItem
            icon={<CalendarDays size={19} />}
            label="Due Date"
            value={formatDate(task.dueDate)}
          />

          <InfoItem
            icon={<CalendarDays size={19} />}
            label="Created On"
            value={formatDate(task.createdAt)}
          />
        </div>
      </section>

      {/* Collaboration placeholder */}
      {/* <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
        <h2 className="font-semibold text-gray-900">
          Task Collaboration
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Comments and activity history can be displayed here
          using your existing comment and activity APIs.
        </p>
      </section> */}
      {/* Task Comments */}
      <TaskComments taskId={task._id} />  
      <TaskActivity taskId={task._id} />
    </div>
  );
}

function StatusButton({
  icon,
  label,
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
