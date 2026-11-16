"use client";

import { useState, useTransition } from "react";
import { runAutomationVerification } from "./actions";

type VerificationResult = Awaited<
  ReturnType<typeof runAutomationVerification>
>;

function Check({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          passed
            ? "bg-emerald-400/10 text-emerald-300"
            : "bg-slate-800 text-slate-500"
        }`}
      >
        {passed ? "PASS" : "PENDING"}
      </span>
    </div>
  );
}

export default function AutomationVerification() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<VerificationResult | null>(null);

  function run() {
    startTransition(async () => {
      const next = await runAutomationVerification();
      setResult(next);
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
            Control Plane / Verification
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Automation Pipeline Verification
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Verifies the authenticated platform automation chain from governed
            rule creation through event emission, job creation, execution, and
            in-app notification delivery.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                End-to-End Automation Test
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Creates an isolated verification rule and event for the current
                organization.
              </p>
            </div>

            <button
              type="button"
              onClick={run}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Running Verification..." : "Run Verification"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <Check
            label="Automation rule created through governed RPC"
            passed={Boolean(result?.ruleId)}
          />
          <Check
            label="Platform event emitted"
            passed={Boolean(result?.eventId)}
          />
          <Check
            label="Automation job queued"
            passed={Boolean(result?.jobId)}
          />
          <Check
            label="Automation job completed"
            passed={result?.executionStatus === "completed"}
          />
          <Check
            label="In-app notification created"
            passed={Boolean(result?.notificationId)}
          />
          <Check
            label="Notification delivery created"
            passed={Boolean(result?.deliveryId)}
          />
        </div>

        {result?.error ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
              Verification Failed
            </p>
            <p className="mt-2 text-sm leading-6 text-red-200">
              {result.error}
            </p>
          </div>
        ) : null}

        {result?.success ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Verification Passed
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-200">
              Event → Rule → Job → Executor → Notification completed through
              the authenticated application path.
            </p>

            <div className="mt-5 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
              <div>
                <span className="text-slate-600">Rule</span>
                <p className="mt-1 break-all text-slate-300">{result.ruleId}</p>
              </div>
              <div>
                <span className="text-slate-600">Event</span>
                <p className="mt-1 break-all text-slate-300">{result.eventId}</p>
              </div>
              <div>
                <span className="text-slate-600">Job</span>
                <p className="mt-1 break-all text-slate-300">{result.jobId}</p>
              </div>
              <div>
                <span className="text-slate-600">Notification</span>
                <p className="mt-1 break-all text-slate-300">
                  {result.notificationId}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
