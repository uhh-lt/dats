import { ReactNode } from "react";

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: "Create" | "Navigation" | "Settings" | "Analysis";
  icon?: ReactNode;
  action?: () => void;
  route?: string;
  keywords?: string[];
}
