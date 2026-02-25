import { styled, Toolbar } from "@mui/material";

export const DATSToolbar = styled(Toolbar)(({ theme }) => ({
  zIndex: theme.zIndex.appBar + 1,
  backgroundColor: theme.palette.background.paper,
  borderBottom: "1px solid",
  borderColor: theme.palette.divider,
  justifyContent: "center",
  gap: 8,
  minHeight: 49,
})) as typeof Toolbar;
