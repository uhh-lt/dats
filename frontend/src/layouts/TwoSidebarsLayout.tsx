import { Grid } from "@mui/material";
import { ReactNode } from "react";

function TwoSidebarsLayout({
  leftSidebar,
  content,
  rightSidebar,
}: {
  leftSidebar: ReactNode;
  content: ReactNode;
  rightSidebar: ReactNode;
}) {
  return (
    <Grid container className="h100">
      <Grid
        item
        md={2}
        className="h100"
        sx={{
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: (theme) => theme.palette.background.paper,
          borderRight: "1px solid #e8eaed",
          boxShadow: 4,
        }}
      >
        {leftSidebar}
      </Grid>
      <Grid item md={8} className="h100" sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}>
        {content}
      </Grid>
      <Grid
        item
        md={2}
        className="h100"
        sx={{
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: (theme) => theme.palette.background.paper,
          borderLeft: "1px solid #e8eaed",
          boxShadow: 4,
        }}
      >
        {rightSidebar}
      </Grid>
    </Grid>
  );
}

export default TwoSidebarsLayout;
