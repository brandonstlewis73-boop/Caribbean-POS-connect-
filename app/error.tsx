"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-950">
      <section role="alert" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">We couldn’t load this page</h1>
        <p className="mt-3 text-base text-slate-600">Please check your connection and try again.</p>
        <button onClick={reset} className="mt-6 min-h-12 rounded-xl bg-teal-700 px-6 font-bold text-white">Try again</button>
        <Link href="/" className="ml-4 inline-block py-3 font-semibold text-teal-700">Back to dashboard</Link>
      </section>
    </main>
  );
}
