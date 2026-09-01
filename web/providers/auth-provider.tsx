"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import type { ComponentProps } from "react";
import { setApiTokenGetter } from "@/lib/api/client";
import type { AuthContextValue, AuthProviderProps } from "./types";

// Matches the OrbitX dark theme (see app/globals.css).
const clerkAppearance: ComponentProps<typeof ClerkProvider>["appearance"] = {
  variables: {
    colorPrimary: "#8fafc4",
    colorPrimaryForeground: "#0c0c0b",
    colorForeground: "#e9e7e2",
    colorMuted: "#1a1a18",
    colorMutedForeground: "#8b8880",
    colorBackground: "#141413",
    colorInput: "#0c0d0f",
    colorInputForeground: "#e9e7e2",
    colorBorder: "rgba(228, 222, 208, 0.085)",
    colorRing: "rgba(143, 175, 196, 0.4)",
    colorModalBackdrop: "rgba(0, 0, 0, 0.6)",
    colorDanger: "#d25e58",
    colorSuccess: "#5a9873",
    colorWarning: "#c07c3a",
    colorNeutral: "#e9e7e2",
    colorShimmer: "rgba(143, 175, 196, 0.2)",
    borderRadius: "0",
    fontFamily: "var(--font-inter), sans-serif",
  },
  elements: {
    card: "bg-surface-1 border border-[var(--bd)] shadow-none",
    headerTitle: "text-text-primary",
    headerSubtitle: "text-text-tertiary",
    socialButtonsBlockButton:
      "border border-[var(--bd)] bg-surface-2 text-text-secondary hover:bg-surface-3",
    dividerLine: "bg-[var(--bd)]",
    dividerText: "text-text-tertiary",
    formFieldLabel: "text-text-secondary",
    formFieldInput:
      "border border-[var(--bd)] bg-[var(--field)] text-text-primary focus:border-[var(--acc-border)]",
    formButtonPrimary:
      "border border-[var(--acc-border)] bg-[var(--acc-tint)] text-[var(--acc-text)] hover:bg-[rgba(143,175,196,.18)] shadow-none",
    footerActionText: "text-text-tertiary",
    footerActionLink: "text-[var(--acc-text)] hover:text-[var(--acc-hover)]",
    footer: "bg-surface-2 border-t border-[var(--bd)]",
  },
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const unavailableAuth: AuthContextValue = {
  configured: false,
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
  openSignIn: () => undefined,
};

const AuthContext = createContext<AuthContextValue>(unavailableAuth);

function ClerkAuthBridge({ children }: AuthProviderProps) {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  // Let the API client attach this user's token to every request so read
  // endpoints resolve the caller (owner-or-public visibility).
  useEffect(() => {
    setApiTokenGetter(() => getToken());
    return () => setApiTokenGetter(null);
  }, [getToken]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: true,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    getToken,
    openSignIn: () => router.push("/sign-in"),
  }), [getToken, isLoaded, isSignedIn, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  if (!publishableKey) {
    return <AuthContext.Provider value={unavailableAuth}>{children}</AuthContext.Provider>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function useOrbitAuth(): AuthContextValue {
  return useContext(AuthContext);
}
