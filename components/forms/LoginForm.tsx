"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch {
      setError("Login failed. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-card border border-white/10 bg-white/[0.06] p-6 shadow-soft backdrop-blur-xl">
      <div>
        <Image src="/caribbean-pos-connect-icon.png" alt="" width={56} height={56} className="mb-4 h-14 w-14 rounded-2xl object-contain" priority />
        <h1 className="text-2xl font-black">Caribbean POS Connect</h1>
        <p className="mt-2 text-sm font-semibold text-teal-50/65">
          Sign in to manage sales, customers, inventory, orders, delivery, reports, and subscriptions.
        </p>
      </div>
      <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <Button variant="primary" size="lg" disabled={loading}>
        <LogIn className="h-4 w-4" />
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-teal-50/70">
        <Link href="/signup" className="text-cyan-200">Create business account</Link>
        <Link href="/forgot-password" className="text-cyan-200">Forgot password?</Link>
      </div>
    </form>
  );
}

