"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserButton } from "@clerk/nextjs";
import { useOrbitAuth } from "@/providers/auth-provider";

const DEMO_EMAIL = "demouser@gmail.com";
const DEMO_PASSWORD = "demo_user@123456";

function DemoCredentialsModal({
  onClose,
  onContinue,
}: {
  onClose: () => void;
  onContinue: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Demo credentials"
      onClick={onClose}
    >
      <div
        className="panel-rise w-full max-w-[340px] border border-[var(--bd)] bg-surface-1"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-10 items-center justify-between border-b border-[var(--bd)] bg-surface-2 px-3.5 py-[11px]">
          <h2 className="text-[12.5px] leading-none font-semibold tracking-[-0.006em] text-text-primary">
            Demo credentials
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[13px] leading-none text-text-tertiary transition-colors hover:text-text-primary"
          >
            ✕
          </button>
        </header>

        <div className="space-y-3 px-3.5 py-4">
          <p className="text-[10.5px] leading-relaxed text-text-tertiary">
            Use these credentials to explore OrbitX, then continue to sign in.
          </p>

          <dl className="space-y-2">
            <div className="flex items-center justify-between border border-[var(--bd)] bg-surface-2 px-3 py-2">
              <dt className="text-[8.5px] uppercase tracking-wide text-text-tertiary">Email</dt>
              <dd className="numeric text-[11px] text-text-secondary">{DEMO_EMAIL}</dd>
            </div>
            <div className="flex items-center justify-between border border-[var(--bd)] bg-surface-2 px-3 py-2">
              <dt className="text-[8.5px] uppercase tracking-wide text-text-tertiary">Password</dt>
              <dd className="numeric text-[11px] text-text-secondary">{DEMO_PASSWORD}</dd>
            </div>
          </dl>

          <button
            onClick={onContinue}
            className="h-[32px] w-full border border-[var(--acc-border)] bg-[var(--acc-tint)] text-[10px] font-medium text-[var(--acc-text)] transition-colors duration-150 hover:bg-[rgba(143,175,196,.18)]"
          >
            Continue to sign in
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfiguredAuthControls() {
  const { isLoaded, isSignedIn, openSignIn } = useOrbitAuth();
  const [showDemo, setShowDemo] = useState(false);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <>
        <button
          onClick={() => setShowDemo(true)}
          className="h-[30px] border border-[var(--acc-border)] bg-[var(--acc-tint)] px-3 text-[10px] font-medium text-[var(--acc-text)] transition-colors duration-150 hover:bg-[rgba(143,175,196,.18)]"
        >
          Sign in
        </button>
        {showDemo ? (
          <DemoCredentialsModal
            onClose={() => setShowDemo(false)}
            onContinue={() => {
              setShowDemo(false);
              openSignIn();
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-[30px] w-[30px] rounded-none",
          userButtonPopoverCard: "rounded-none",
        },
      }}
    />
  );
}

export function AuthControls() {
  const auth = useOrbitAuth();
  if (!auth.configured) return null;
  return <ConfiguredAuthControls />;
}
