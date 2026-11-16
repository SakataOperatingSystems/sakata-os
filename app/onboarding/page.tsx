import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export default async function OrganizationAccessOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
            SAKATA OS
          </p>
          <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
            Organization access is not set up yet
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Your account is authenticated, but it is not currently linked to
            an active SAKATA OS organization. Ask your organization
            administrator to grant you access. Once your membership is active,
            your organization&apos;s applications will appear in My
            Applications.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            No organization or platform permissions have been granted to this
            account automatically.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Return to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
