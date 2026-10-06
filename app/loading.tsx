export default function LoadingPage() {
  return (
    <main aria-busy="true" aria-label="Loading page" className="min-h-screen bg-slate-50 p-5 text-slate-950">
      <div role="status" className="mx-auto max-w-6xl">
        <p className="mb-6 text-base font-semibold text-slate-600">Loading your workspace…</p>
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}
