import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export default async function SchoolLayout({
  children,
}: LayoutProps<"/school">) {
  await requirePermission("school.academic_periods.read");

  const { organization } = await getOrganizationContext();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.2em] text-sky-300"
            >
              SAKATA OS
            </Link>

            <p className="mt-1 text-lg font-semibold">
              School Operating System
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Organization
            </p>

            <p className="mt-1 text-sm font-medium text-slate-200">
              {organization.name}
            </p>
          </div>
        </div>

        <nav className="border-t border-slate-900">
          <div className="mx-auto flex max-w-7xl gap-6 px-6 py-3 text-sm">
            <Link
              href="/school"
              className="text-slate-400 transition hover:text-white"
            >
              School OS
            </Link>

            <Link
              href="/school/academic-periods"
              className="text-slate-400 transition hover:text-white"
            >
              Academic Periods
            </Link>
          </div>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}