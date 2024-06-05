import { Box, Container } from "@mui/material";
import { ReactNode } from "react";

function NoSidebarLayout({ children }: { children: ReactNode }) {
  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        {children}
      </Container>
    </Box>
  );
}

export default NoSidebarLayout;
