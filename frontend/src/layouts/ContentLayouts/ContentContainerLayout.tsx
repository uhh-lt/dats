import { Container } from "@mui/material";
import { ReactNode } from "react";

export function ContentContainerLayout({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
      {children}
    </Container>
  );
}
