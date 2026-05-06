import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-caribbean-cloud px-4 py-8 dark:bg-slate-950">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
