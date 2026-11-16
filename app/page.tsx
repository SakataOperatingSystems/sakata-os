import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/app/components/theme-toggle";
import { createClient } from "@/app/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/applications");

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
          SAKATA Operating Systems
        </p>
        <ThemeToggle />
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-84px)] max-w-7xl items-center px-5 pb-16 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            SAKATA TECHNOLOGIES
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            One platform.
            <span className="block text-sky-300">Connected operations.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
            A shared multi-tenant platform for purpose-built operating
            applications, with organization-scoped access and accountable
            workflows.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-sky-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
