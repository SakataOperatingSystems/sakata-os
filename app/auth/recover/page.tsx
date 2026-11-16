"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PasswordField from "@/app/login/password-field";
import { createClient } from "@/app/lib/supabase/client";
import { validateNewPassword } from "./validation";

export default function RecoverPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setPassword("");
    setConfirmation("");

    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });

      if (updateError) {
        setError(
          "Your password could not be changed. Request a new recovery link and try again.",
        );
        return;
      }

      router.replace("/auth/continue");
      router.refresh();
    } catch {
      setError(
        "Your password could not be changed. Request a new recovery link and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            SAKATA TECHNOLOGIES
          </p>
          <p className="mt-2 text-sm font-medium tracking-[0.18em] text-sky-300">
            SAKATA OPERATING SYSTEMS
          </p>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Choose a new password
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Enter a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <PasswordField
              id="new-password"
              name="new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
            />
            <PasswordField
              id="confirm-password"
              name="confirm-password"
              label="Confirm new password"
              value={confirmation}
              onChange={setConfirmation}
              autoComplete="new-password"
              placeholder="Enter the same password again"
              minLength={8}
            />

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Updating password…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
