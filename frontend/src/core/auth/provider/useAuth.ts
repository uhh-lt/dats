import { useContext } from "react";
import { AuthContext } from "../types/AuthContext";

export const useAuth = () => useContext(AuthContext)!;
