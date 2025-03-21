import { Card, CardContent, CardHeader, Divider } from "@mui/material";
import { ReactNode } from "react";

interface DocumentImportSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function DialogSection({ title, children, action }: DocumentImportSectionProps) {
  return (
    <Card className="h100 myFlexContainer" variant="outlined" sx={{ width: "100%" }}>
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
      <CardContent className="myFlexFillAllContainer">{children}</CardContent>
    </Card>
  );
}
