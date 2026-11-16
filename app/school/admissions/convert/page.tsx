"use client";

import { useEffect, useState } from "react";

import { convertAdmissionToStudent } from "./actions";

type Admission = {
  id: string;
  admission_request_id: string;
  applicant_name: string;
  applicant_gender: string | null;
  applicant_date_of_birth: string | null;
  requested_admission_date: string | null;
  status: string;
  created_at: string;
};

type ConversionResult = {
  studentReference: string;
  admissionReference: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  converted: "Converted",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  unspecified: "Unspecified",
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function AdmissionConversionPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAdmissions() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/school/admissions/convert", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load admission requests.");
      }

      const payload = await response.json();
      setAdmissions(payload.admissions ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load admission requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAdmissions();
  }, []);

  async function handleConvert(admissionId: string) {
    setWorkingId(admissionId);
    setError(null);
    setResult(null);

    try {
      const converted = await convertAdmissionToStudent(admissionId);

      setResult({
        studentReference: converted.studentReference,
        admissionReference: converted.admissionReference,
      });

      await loadAdmissions();
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Student conversion failed."
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            School OS · Admissions
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Convert Admissions
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Turn an admission request into the student&apos;s durable
                institutional identity without re-entering information the
                system already knows.
              </p>
            </div>

            <a
              href="/school/admissions"
              className="inline-flex w-fit items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to Admissions
            </a>
          </div>
        </div>

        {result ? (
          <section className="mb-6 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Conversion complete
            </p>

            <h2 className="mt-2 text-xl font-semibold text-white">
              Student identity created
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-900/50 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Student
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {result.studentReference}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-900/50 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Admission
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {result.admissionReference}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-emerald-200/80">
              The Student is now permanently linked to the originating
              admission request.
            </p>
          </section>
        ) : null}

        {error ? (
          <section className="mb-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-5">
            <p className="text-sm text-red-200">{error}</p>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-base font-semibold text-white">
              Admission Requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Convert an eligible admission into a Student record.
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Loading admission requests...
            </div>
          ) : admissions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-300">
                No eligible admission requests.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Approved or open admissions that have not already been
                converted will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {admissions.map((admission) => (
                <article
                  key={admission.id}
                  className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">
                        {admission.applicant_name}
                      </h3>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
                        {admission.admission_request_id}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
                        {STATUS_LABELS[admission.status] ?? admission.status}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                      <span>
                        Gender:{" "}
                        <strong className="font-medium text-slate-300">
                          {admission.applicant_gender
                            ? GENDER_LABELS[admission.applicant_gender] ??
                              admission.applicant_gender
                            : "Not recorded"}
                        </strong>
                      </span>

                      <span>
                        Date of birth:{" "}
                        <strong className="font-medium text-slate-300">
                          {formatDate(admission.applicant_date_of_birth)}
                        </strong>
                      </span>

                      <span>
                        Requested admission:{" "}
                        <strong className="font-medium text-slate-300">
                          {formatDate(admission.requested_admission_date)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleConvert(admission.id)}
                    disabled={workingId !== null}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {workingId === admission.id
                      ? "Converting..."
                      : "Convert to Student"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
