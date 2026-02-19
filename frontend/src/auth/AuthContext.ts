import { createContext } from "react";
import { AuthState } from "./AuthState.ts";

export const AuthContext = createContext<AuthState | null>(null);
