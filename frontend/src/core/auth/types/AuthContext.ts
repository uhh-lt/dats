import { createContext } from "react";
import { AuthState } from "./AuthState";

export const AuthContext = createContext<AuthState | null>(null);
