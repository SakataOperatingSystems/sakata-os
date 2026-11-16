"use client";

import { useState, useTransition } from "react";

import { createAutomationRule } from "./actions";

type CreateAutomationRuleFormProps = {
  canManage: boolean;
};

const EVENT_OPTIONS = [
  {
    value: "student.created",
    label: "Student created",
    entity: "student",
  },
  {
    value: "admission.converted",
    label: "Admission converted",
    entity: "student_admission_request",
  },
];

export default function CreateAutomationRuleForm({
  canManage,
}: CreateAutomationRuleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [eventType, setEventType] = useState(EVENT_OPTIONS[0].value);
  const selectedEvent =
    EVENT_OPTIONS.find((event) => event.value === eventType) ??
    EVENT_OPTIONS[0];

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Automation Governance
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Rule configuration
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Your current permissions allow you to view automation, but not
          create or change automation rules.
        </p>
      </div>
    );
  }

  function submit(formData: FormData) {
    setMessage(null);
    setError(null);

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const priority = String(formData.get("priority") ?? "normal");

    if (!name || !title || !body) {
      setError("Rule name, notification title, and notification body are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createAutomationRule({
          name,
          description: description || null,
          eventType,
          entityType: selectedEvent.entity,
          actionType: "notification.in_app",
          actionConfig: {
            notification_type: "operational",
            title,
            body,
            priority,
            recipient_mode: "event_actor",
          },
          enabled: true,
        });

        setMessage(
          "Automation rule created and enabled. Future matching events will enqueue automation jobs."
        );

        const form = document.getElementById(
          "create-automation-rule-form"
        ) as HTMLFormElement | null;

        form?.reset();
        setEventType(EVENT_OPTIONS[0].value);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Failed to create automation rule."
        );
      }
    });
  }

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
          Automation Builder
        </p>
        <h2 className="text-xl font-semibold text-white">
          Create automation rule
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-400">
          Define an event-driven rule that creates an in-app notification for
          the user who caused the event. The rule is validated and created
          through the governed automation service.
        </p>
      </div>

      <form
        id="create-automation-rule-form"
        action={submit}
        className="mt-6 space-y-6"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label
              htmlFor="automation-name"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Rule name
            </label>
            <input
              id="automation-name"
              name="name"
              type="text"
              required
              placeholder="Example: Notify on new student"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-500"
            />
          </div>

          <div>
            <label
              htmlFor="automation-event"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Trigger event
            </label>
            <select
              id="automation-event"
              name="eventType"
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
            >
              {EVENT_OPTIONS.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600">
              Entity: {selectedEvent.entity}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="automation-description"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
          >
            Description
          </label>
          <textarea
            id="automation-description"
            name="description"
            rows={3}
            placeholder="Describe the operational purpose of this rule."
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-500"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Action
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                In-app notification
              </p>
            </div>

            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Enabled
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <label
                htmlFor="automation-title"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Notification title
              </label>
              <input
                id="automation-title"
                name="title"
                type="text"
                required
                placeholder="Example: New student created"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-500"
              />
            </div>

            <div>
              <label
                htmlFor="automation-priority"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
              >
                Priority
              </label>
              <select
                id="automation-priority"
                name="priority"
                defaultValue="normal"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="automation-body"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              Notification body
            </label>
            <textarea
              id="automation-body"
              name="body"
              rows={4}
              required
              placeholder="Describe what the recipient needs to know."
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-500"
            />
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Recipient
            </p>
            <p className="mt-1 text-sm text-white">
              Event actor
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              The system resolves the authenticated user responsible for the
              triggering event. No internal user ID is entered manually.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-300">
            {message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-600">
            Creation is permission-gated and executed through the automation
            RPC. Direct table writes are not used.
          </p>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Creating rule..." : "Create automation rule"}
          </button>
        </div>
      </form>
    </section>
  );
}
