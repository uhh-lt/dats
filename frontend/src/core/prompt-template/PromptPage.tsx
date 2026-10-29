import { Card, CardContent, Container } from "@mui/material";
import { ReactNode } from "react";

interface PromptPageProps {
  children: ReactNode;
}

/** Shows a prompt like a page, as the annotation view shows a document. */
export function PromptPage({ children }: PromptPageProps) {
  return (
    <Container sx={{ py: 2 }} maxWidth="lg">
      <Card raised>
        <CardContent sx={{ p: 3 }}>{children}</CardContent>
      </Card>
    </Container>
  );
}
