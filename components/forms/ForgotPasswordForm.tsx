"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { readApiPayload } from "@/lib/client-response";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await readApiPayload<{ message: string }>(response);
      if (!response.ok) {
        setError(payload.error || "Reset request failed.");
        return;
      }
      setMessage(payload.data?.message || "Reset request recorded.");
    } catch {
      setError("Reset request failed. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-card border border-white/10 bg-white/[0.06] p-6 shadow-soft backdrop-blur-xl">
      <div>
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-card bg-cyan-300 text-slate-950">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black">Reset password</h1>
        <p className="mt-2 text-sm font-semibold text-teal-50/70">
          Enter the business owner email for the account.
        </p>
      </div>
      <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-card bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      <Button variant="primary" size="lg" disabled={loading}>
        {loading ? "Submitting..." : "Request reset"}
      </Button>
      <Link href="/login" className="text-center text-sm font-black text-cyan-200">
        Back to sign in
      </Link>
    </form>
  );
}
