import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/app/components/theme-toggle";
import {
  getCurrentPermissions,
  hasActiveProductDeployment,
} from "@/app/lib/auth/authorization";
import { getOrganizationContext } from "@/app/lib/auth/organization-context";

export default async function BusinessLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await hasActiveProductDeployment("business_os"))) {
    redirect("/applications");
  }

  const permissions = await getCurrentPermissions();
  if (!permissions.has("core.tasks.read")) {
    redirect("/applications");
  }

  const { organization } = await getOrganizationContext();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              SAKATA OPERATING SYSTEMS
            </p>
            <Link
              href="/business"
              className="mt-1 block text-lg font-semibold text-violet-200"
            >
              Business OS
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Organization
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {organization.name}
              </p>
            </div>
          </div>
        </div>

        <nav className="border-t border-slate-900">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-6 py-3 text-sm">
            <Link
              href="/business"
              className="text-slate-300 transition hover:text-white"
            >
              Overview
            </Link>
            <Link
              href="/business/tasks"
              className="text-slate-400 transition hover:text-white"
            >
              Tasks
            </Link>
            <Link
              href="/applications"
              className="text-slate-400 transition hover:text-white"
            >
              Applications
            </Link>
            <Link
              href="/preferences"
              className="text-slate-400 transition hover:text-white"
            >
              Preferences
            </Link>
          </div>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
