import { Card, CardContent, CardHeader, Divider } from "@mui/material";
import { ReactNode } from "react";

interface DocumentImportSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function DialogSection({ title, children, action }: DocumentImportSectionProps) {
  return (
    <Card sx={{ flex: 1 }} variant="outlined">
      <CardHeader
        title={title}
        slotProps={{
          title: {
            variant: "h6",
          },
        }}
        sx={{
          py: 1,
        }}
        action={action}
      />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
