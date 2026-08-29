import type { ReactNode } from "react";

export interface QueryProviderProps {
  children: ReactNode;
}

export interface AuthProviderProps {
  children: ReactNode;
}

export interface AuthContextValue {
  configured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  openSignIn: () => void;
}
