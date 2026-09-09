import { SignupForm } from "@/components/forms/SignupForm";
import { publicPlanId } from "@/lib/marketing-content";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const selectedPlan = publicPlanId((await searchParams).plan);
  return (
    <main className="grid min-h-screen place-items-center bg-caribbean-cloud px-4 py-8 dark:bg-slate-950">
      <SignupForm selectedPlan={selectedPlan} />
    </main>
  );
}
