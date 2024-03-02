import { Box, Card, CardContent, CardHeader, Container, Portal, Typography } from "@mui/material";
import { MRT_TableInstance, MaterialReactTable } from "material-react-table";
import { useContext } from "react";
import { AppBarContext } from "../../layouts/TwoBarLayout.tsx";
import { AnaylsisDashboardRow } from "./useAnalysisDashboardTable.tsx";

interface AnalysisDashboardProps {
  pageTitle: string;
  headerTitle: string;
  subheaderTitle?: string;
  table: MRT_TableInstance<AnaylsisDashboardRow>;
}

export default function AnalysisDashboard(props: AnalysisDashboardProps) {
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {props.pageTitle}
        </Typography>
      </Portal>

      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title={props.headerTitle} subheader={props.subheaderTitle} />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              <MaterialReactTable table={props.table} />
            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
