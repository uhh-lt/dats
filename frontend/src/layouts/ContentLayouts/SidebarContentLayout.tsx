import { Grid2 } from "@mui/material";
import { ReactNode } from "react";

function SidebarContentLayout({ leftSidebar, content }: { leftSidebar: ReactNode; content: ReactNode }) {
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
        className="myFlexContainer h100"
        sx={{
          bgcolor: (theme) => theme.palette.grey[200],
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {content}
      </Grid2>
    </Grid2>
  );
}

export default SidebarContentLayout;
