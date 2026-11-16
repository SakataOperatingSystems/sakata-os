import Link from "next/link";
import ThemePreferences from "@/app/components/theme-preferences";

export default function PreferencesPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-sky-800 underline-offset-4 hover:underline dark:text-sky-300"
        >
          Back to SAKATA OS
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">
          User preferences
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          These preferences are stored in this browser and apply across SAKATA OS.
        </p>
        <div className="mt-6">
          <ThemePreferences />
        </div>
      </div>
    </main>
  );
}
