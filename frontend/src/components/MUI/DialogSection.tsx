import { Card, CardContent, CardContentProps, CardHeader, Divider } from "@mui/material";
import { ReactNode } from "react";

interface DialogSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  cardContentProps?: Omit<CardContentProps, "className">;
}

export function DialogSection({ title, children, action, cardContentProps }: DialogSectionProps) {
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
      <CardContent className="myFlexFillAllContainer" {...cardContentProps}>
        {children}
      </CardContent>
    </Card>
  );
}
