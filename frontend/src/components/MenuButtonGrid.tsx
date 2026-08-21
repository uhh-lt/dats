import { Box } from "@mui/material";
import { ReactNode } from "react";

interface MenuButtonGridProps {
  columns: number;
  children: ReactNode;
}

/** Grid container for grid-style menu buttons. */
export function MenuButtonGrid({ columns, children }: MenuButtonGridProps) {
  return (
    <Box
      sx={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: "1fr", gap: 0.5 }}
    >
      {children}
    </Box>
  );
}
