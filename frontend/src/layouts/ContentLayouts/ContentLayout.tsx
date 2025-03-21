import { Box } from "@mui/material";
import { ReactNode } from "react";

function ContentLayout({ children }: { children: ReactNode }) {
  return <Box className="h100">{children}</Box>;
}

export default ContentLayout;
