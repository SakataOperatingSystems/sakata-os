import Link from "next/link";
import {
  hasPermission,
  requirePermission,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";
import { createClient } from "@/app/lib/supabase/server";
import ArchiveDocumentForm from "./archive-form";
import DocumentForm from "./form";
import type { DocumentCategory } from "./validation";

type OrganizationDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  reference_number: string | null;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

const categoryLabels: Record<DocumentCategory, string> = {
  general: "General",
  policy: "Policy",
  contract: "Contract",
  financial: "Financial",
  personnel: "Personnel",
  compliance: "Compliance",
  other: "Other",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default async function DocumentsPage() {
  await requirePermission("core.documents.read");

  const context = await getOrganizationContext();
  const supabase = await createClient();
  const canManage = await hasPermission("core.documents.manage");
  const { data, error } = await supabase
    .from("organization_documents")
    .select(
      "id, title, category, reference_number, description, status, created_at, updated_at",
    )
    .eq("organization_id", context.organization.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load document register: ${error.message}`);
  }

  const documents = (data ?? []) as OrganizationDocument[];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-x-3 gap-y-2 text-sm text-slate-400">
          <Link className="transition hover:text-white" href="/school">
            School OS
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-slate-200">
            Documents
          </span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            SAKATA OPERATING SYSTEMS · SHARED CAPABILITY
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Document register
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Organization-scoped metadata for records your team needs to track.
            This register does not store document files or create public links.
          </p>
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
            File storage is not configured. Do not enter document contents or
            private file locations here.
          </p>
        </header>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <section aria-labelledby="register-heading" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="register-heading" className="text-xl font-semibold">
                  {context.organization.name} register
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {documents.length} {documents.length === 1 ? "entry" : "entries"}
                </p>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-sm leading-6 text-slate-400">
                No document metadata has been recorded for this organization.
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => (
                  <li
                    key={document.id}
                    className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-slate-100">
                          {document.title}
                        </h3>
                        <p className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                            {categoryLabels[document.category] ?? "Other"}
                          </span>
                          <span
                            className={
                              document.status === "active"
                                ? "rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300"
                                : "rounded-full bg-slate-800 px-2.5 py-1 text-slate-400"
                            }
                          >
                            {document.status === "active" ? "Active" : "Archived"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      {document.reference_number && (
                        <div className="min-w-0">
                          <dt className="text-xs uppercase tracking-wide text-slate-500">
                            Reference
                          </dt>
                          <dd className="mt-1 break-words text-slate-300">
                            {document.reference_number}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Recorded
                        </dt>
                        <dd className="mt-1 text-slate-300">
                          {formatDate(document.created_at)}
                        </dd>
                      </div>
                    </dl>

                    {document.description && (
                      <details className="mt-4 border-t border-slate-800 pt-4">
                        <summary className="cursor-pointer text-sm font-medium text-slate-300 hover:text-white">
                          View description
                        </summary>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                          {document.description}
                        </p>
                      </details>
                    )}

                    {canManage && document.status === "active" && (
                      <ArchiveDocumentForm id={document.id} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canManage ? (
            <section aria-label="Create document register entry">
              <DocumentForm />
            </section>
          ) : (
            <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm leading-6 text-slate-400">
              You have read-only access to this register. An organization
              administrator can grant document management permission.
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}
