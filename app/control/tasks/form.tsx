"use client";

import { useActionState } from "react";
import { createTask, updateTask } from "./actions";

type TaskFormTask = {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  due_at: string | null;
};

type TaskFormProps = {
  task?: TaskFormTask;
};

const initialState = {
  success: false,
  error: null,
};

function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) => String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TaskForm({ task }: TaskFormProps) {
  const isEditing = Boolean(task);

  const [state, formAction, pending] = useActionState(
    isEditing ? updateTask : createTask,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
    >
      {isEditing && (
        <input
          type="hidden"
          name="id"
          value={task?.id ?? ""}
        />
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
          {isEditing ? "Edit Task" : "Create Task"}
        </p>

        <h2 className="mt-2 text-xl font-semibold text-slate-100">
          {isEditing
            ? "Update operational work"
            : "Record operational work"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isEditing
            ? "Change the task state or operational details."
            : "Create a reusable tenant-scoped unit of accountable work."}
        </p>
      </div>

      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-300">
            {state.error}
          </p>
        </div>
      )}

      {state.success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-300">
            Task saved successfully.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor={isEditing ? `task-title-${task?.id}` : "task-title"}
          className="block text-sm font-medium text-slate-300"
        >
          Title
        </label>

        <input
          id={isEditing ? `task-title-${task?.id}` : "task-title"}
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={task?.title ?? ""}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          placeholder="e.g. Verify attendance register"
        />
      </div>

      <div>
        <label
          htmlFor={isEditing ? `task-description-${task?.id}` : "task-description"}
          className="block text-sm font-medium text-slate-300"
        >
          Description
        </label>

        <textarea
          id={
            isEditing
              ? `task-description-${task?.id}`
              : "task-description"
          }
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={task?.description ?? ""}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          placeholder="Describe the operational outcome required."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor={isEditing ? `task-status-${task?.id}` : "task-status"}
            className="block text-sm font-medium text-slate-300"
          >
            Status
          </label>

          <select
            id={isEditing ? `task-status-${task?.id}` : "task-status"}
            name="status"
            defaultValue={task?.status ?? "open"}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={
              isEditing
                ? `task-priority-${task?.id}`
                : "task-priority"
            }
            className="block text-sm font-medium text-slate-300"
          >
            Priority
          </label>

          <select
            id={
              isEditing
                ? `task-priority-${task?.id}`
                : "task-priority"
            }
            name="priority"
            defaultValue={task?.priority ?? "normal"}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor={isEditing ? `task-due-${task?.id}` : "task-due"}
          className="block text-sm font-medium text-slate-300"
        >
          Due date and time
        </label>

        <input
          id={isEditing ? `task-due-${task?.id}` : "task-due"}
          name="due_at"
          type="datetime-local"
          defaultValue={toDateTimeLocal(task?.due_at ?? null)}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
        />

        <p className="mt-2 text-xs text-slate-500">
          Optional operational deadline.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? "Saving..."
          : isEditing
            ? "Save Task"
            : "Create Task"}
      </button>
    </form>
  );
}
