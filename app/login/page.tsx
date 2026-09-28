"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          });
    setBusy(false);
    if (error) return setError(error.message);
    if (mode === "signup" && !data.session) {
      return setNotice("Check your email for a link to confirm your account, then sign in.");
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="panel">
        <h1 className="text-2xl font-extrabold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-muted">Your study sets and homework are saved to your account.</p>
        {!configured && (
          <p className="mt-4 rounded-xl bg-bad-soft p-3 text-sm text-bad">
            Supabase isn&apos;t configured yet. See the README to add your keys.
          </p>
        )}
        <button type="button" onClick={google} disabled={!configured} className="btn mt-5 w-full">
          Continue with Google
        </button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-bad">{error}</p>}
          {notice && <p className="text-sm text-good">{notice}</p>}
          <button className="btn btn-primary w-full" disabled={busy || !configured}>
            {busy ? "One sec…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-sm text-muted hover:text-text"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
