import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="text-center">
        <h1 className="text-[18px] font-semibold tracking-tight text-text-primary">OrbitX</h1>
        <p className="mt-1 text-[11px] text-text-tertiary">Sign in to continue</p>
      </div>
      <SignIn fallbackRedirectUrl="/" />
      <div className="border border-[var(--bd)] bg-surface-2 px-4 py-3 text-center">
        <p className="text-[8.5px] uppercase tracking-wide text-text-tertiary">Demo credentials</p>
        <p className="numeric mt-1 text-[11px] text-text-secondary">demouser@gmail.com / demo_user@123456</p>
      </div>
    </main>
  );
}
