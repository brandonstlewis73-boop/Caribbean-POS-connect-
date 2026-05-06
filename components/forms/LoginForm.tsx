"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type LoginResponse = {
  data?: unknown;
  error?: string;
};

async function readLoginResponse(response: Response): Promise<LoginResponse> {
  const text = await response.text();
  if (!text) {
    return response.ok ? { data: null } : { error: "Login failed. The server returned an empty response." };
  }

  try {
    return JSON.parse(text) as LoginResponse;
  } catch {
    return response.ok
      ? { data: null }
      : { error: "Login failed. The server returned an unexpected response." };
  }
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await readLoginResponse(response);
      if (!response.ok) {
        setError(payload.error || "Login failed");
        return;
      }
      router.push(params.get("next") || "/");
      router.refresh();
    } catch {
      setError("Login failed. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-card border border-caribbean-line bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div>
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-card bg-caribbean-teal text-lg font-black text-white">
          CP
        </div>
        <h1 className="text-2xl font-black">Caribbean POS Connect</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Sign in with the seeded admin account or another staff role.
        </p>
      </div>
      <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <Button variant="primary" size="lg" disabled={loading}>
        <LogIn className="h-4 w-4" />
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="rounded-card bg-caribbean-cloud p-3 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Demo login without Supabase: admin@demo.com / demo123. Seeded staff use Admin123! after database setup.
      </div>
    </form>
  );
}
