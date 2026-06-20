import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminLogin } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — Coffee Stay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { email } = await login({ data: { password } });
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;
      navigate({ to: "/admin" });
    } catch {
      setError("Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <a href="/" className="inline-block mb-10 text-sm text-muted-foreground hover:text-foreground">
          ← Back to Coffee Stay
        </a>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          Staff <span className="italic text-accent">sign in</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the admin password to continue.
        </p>
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Password</span>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-base outline-none transition focus:border-foreground"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="group mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-foreground px-8 py-4 text-sm font-medium uppercase tracking-[0.18em] text-background transition hover:bg-accent disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
