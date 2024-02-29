import { useContext } from "react";
import { AuthContext } from "./AuthProvider.tsx";

export const useAuth = () => useContext(AuthContext)!;
