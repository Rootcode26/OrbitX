import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="text-center">
        <h1 className="text-[18px] font-semibold tracking-tight text-text-primary">OrbitX</h1>
        <p className="mt-1 text-[11px] text-text-tertiary">Create your operator account</p>
      </div>
      <SignUp fallbackRedirectUrl="/" />
    </main>
  );
}
