import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";

import {
  getTaskComments,
  createTaskComment,
} from "../../api/taskApi";

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAuthorName = (user) => {
  if (!user) return "Unknown user";

  if (typeof user === "string") return "User";

  return user.name || user.email || "Unknown user";
};

const TaskComments = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadComments = useCallback(async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError("");

      const response = await getTaskComments(taskId);

      setComments(
        Array.isArray(response?.data) ? response.data : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load task comments."
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Please enter a comment.");
      return;
    }

    if (trimmedText.length > 2000) {
      setError("Comment cannot exceed 2000 characters.");
      return;
    }

    try {
      setPosting(true);
      setError("");
      setSuccess("");

      const response = await createTaskComment(
        taskId,
        trimmedText
      );

      if (!response?.success || !response?.data) {
        throw new Error(
          response?.message || "Failed to add comment."
        );
      }

      // Add the saved comment returned by the backend.
      setComments((previous) => [
        ...previous,
        response.data,
      ]);

      setText("");
      setSuccess("Comment added successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to add comment."
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquare size={20} />
            Comments
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-600">
              {comments.length}
            </span>
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Discuss this task with your team.
          </p>
        </div>

      </div>

      {/* Error and success messages */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Comment list */}
      <div className="mb-6 space-y-4">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
            <MessageSquare
              size={28}
              className="mx-auto mb-2 text-slate-400"
            />

            <p className="font-medium text-slate-700">
              No comments yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Start the conversation by adding a comment.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment._id}
              className="flex gap-3 rounded-xl bg-slate-50 p-4"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                {getAuthorName(comment.user)
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {getAuthorName(comment.user)}
                  </p>

                  <time
                    dateTime={comment.createdAt}
                    className="text-xs text-slate-500"
                  >
                    {formatDate(comment.createdAt)}
                  </time>
                </div>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {comment.message}
                </p>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="task-comment"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Add a comment
        </label>

        <textarea
          id="task-comment"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="Write your comment..."
          rows={3}
          maxLength={2000}
          disabled={posting}
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">
            {text.length}/2000 characters
          </span>

          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {posting ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default TaskComments;
