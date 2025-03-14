import { Grid2 } from "@mui/material";
import { ReactNode } from "react";

function ContentContentLayout({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) {
  return (
    <Grid2 container columnSpacing={1} className="h100" px={2} pt={2} bgcolor="grey.200">
      <Grid2 size={{ xs: 6 }} className="h100" sx={{ overflowY: "auto", pr: 1, py: 1 }}>
        {leftContent}
      </Grid2>
      <Grid2 size={{ xs: 6 }} className="h100" sx={{ py: 1 }}>
        {rightContent}
      </Grid2>
    </Grid2>
  );
}

export default ContentContentLayout;
