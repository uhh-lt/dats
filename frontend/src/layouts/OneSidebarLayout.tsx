import { Grid2 } from "@mui/material";
import { ReactNode } from "react";

function OneSidebarLayout({ leftSidebar, content }: { leftSidebar: ReactNode; content: ReactNode }) {
  return (
    <Grid2 container className="h100">
      <Grid2
        size={{ md: 3 }}
        className="h100"
        sx={{
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: (theme) => theme.palette.background.paper,
          borderRight: "1px solid #e8eaed",
          boxShadow: 4,
        }}
      >
        {leftSidebar}
      </Grid2>
      <Grid2
        size={{ md: 9 }}
        className="h100"
        sx={{ backgroundColor: (theme) => theme.palette.grey[200], overflow: "auto" }}
      >
        {content}
      </Grid2>
    </Grid2>
  );
}

export default OneSidebarLayout;
