import { Box } from "@mui/material";
import { ReactNode } from "react";

function ContentContentLayout({ children }: { children: ReactNode }) {
  return (
    <Box bgcolor={"grey.200"} className="h100">
      {children}
    </Box>
  );
}

export default ContentContentLayout;
