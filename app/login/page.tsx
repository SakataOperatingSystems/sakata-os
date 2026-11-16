"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import ThemeToggle from "@/app/components/theme-toggle";
import PasswordField from "./password-field";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"sign-in" | "sign-up" | "recovery">(
    "sign-in",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "status">("error");

  function showMessage(value: string, type: "error" | "status" = "error") {
    setMessage(value);
    setMessageType(type);
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("confirmation") !== "failed") {
      return;
    }

    window.history.replaceState(null, "", "/login");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showMessage(
      "Email confirmation could not be completed. Please try the confirmation link again or sign in."
    );
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/recover`,
          },
        );

        if (error) {
          showMessage(
            "Password recovery could not be started. Please try again later.",
          );
          return;
        }

        showMessage(
          "If an account can be recovered with that email, a password reset link will be sent.",
          "status",
        );
        return;
      }

      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        setPassword("");

        if (error) {
          showMessage(
            "Account creation could not be completed. Check your details and try again.",
          );
          return;
        }

        if (data.session) {
          router.replace("/auth/continue");
          router.refresh();
          return;
        }

        showMessage(
          "Account created. Check your email to confirm your address, then sign in to continue.",
          "status",
        );
        setMode("sign-in");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setPassword("");

      if (error) {
        showMessage(
          "Email or password was not recognized. If you are new to SAKATA OS, create an account.",
        );
        return;
      }

      router.replace("/auth/continue");
      router.refresh();
    } catch {
      setPassword("");
      showMessage(
        mode === "recovery"
          ? "Password recovery could not be started. Please try again later."
          : mode === "sign-up"
            ? "Account creation could not be completed. Check your details and try again."
            : "Sign in could not be completed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              SAKATA TECHNOLOGIES
            </p>
            <p className="mt-2 text-sm font-medium tracking-[0.2em] text-sky-300">
              SAKATA OPERATING SYSTEMS
            </p>

            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              {mode === "recovery"
                ? "Reset your password"
                : mode === "sign-up"
                  ? "Create your account"
                  : "Sign in"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {mode === "recovery"
                ? "Enter your account email to receive a password reset link."
                : "Access the applications and organization services available to you."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">
            <form method="post" onSubmit={handleSubmit} className="space-y-5">
              {mode === "sign-up" && (
                <div>
                  <label
                    htmlFor="display-name"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    Name
                  </label>
                  <input
                    id="display-name"
                    name="display-name"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-400/40"
                />
              </div>

              {mode !== "recovery" && (
                <PasswordField
                  id="password"
                  name="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    mode === "sign-up" ? "Create a password" : "Your password"
                  }
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  minLength={mode === "sign-up" ? 8 : undefined}
                />
              )}

              {message && (
                <div
                  role={messageType === "error" ? "alert" : "status"}
                  className={
                    messageType === "error"
                      ? "rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                      : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
                  }
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-sky-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60"
              >
                {loading
                  ? mode === "recovery"
                    ? "Sending link..."
                    : mode === "sign-up"
                      ? "Creating account..."
                      : "Signing in..."
                  : mode === "recovery"
                    ? "Send reset link"
                    : mode === "sign-up"
                      ? "Create account"
                      : "Sign in"}
              </button>
            </form>

            <div className="mt-5 space-y-4 border-t border-slate-800 pt-5 text-center text-sm">
              <Link
                href="/preferences"
                className="block font-medium text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Appearance preferences
              </Link>
              {mode === "sign-in" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode("recovery");
                    setMessage("");
                    setPassword("");
                  }}
                  className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
                >
                  Forgot password?
                </button>
              )}
              <div>
                <span className="text-slate-400">
                  {mode === "sign-up"
                    ? "Already have an account?"
                    : mode === "recovery"
                      ? "Remember your password?"
                      : "New to SAKATA OS?"}
                </span>{" "}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    if (mode === "sign-in") {
                      setMode("sign-up");
                    } else {
                      setMode("sign-in");
                    }
                    setMessage("");
                    setPassword("");
                  }}
                  className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
                >
                  {mode === "sign-in" ? "Create an account" : "Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}