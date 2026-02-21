import { Box } from "@mui/material";
import { ReactNode } from "react";

export function ContentLayout({ children }: { children: ReactNode }) {
  return <Box className="h100">{children}</Box>;
}
