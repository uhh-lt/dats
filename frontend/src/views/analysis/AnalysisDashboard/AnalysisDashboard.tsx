import { Card, CardContent, CardHeader, Portal, Typography } from "@mui/material";
import { MRT_TableInstance, MaterialReactTable } from "material-react-table";
import { useContext } from "react";
import { AppBarContext } from "../../../layouts/AppBarContext.ts";
import NoSidebarLayout from "../../../layouts/NoSidebarLayout.tsx";
import { AnalysisDashboardRow } from "./useAnalysisDashboardTable.tsx";

interface AnalysisDashboardProps<T extends AnalysisDashboardRow> {
  pageTitle: string;
  headerTitle: string;
  subheaderTitle?: string;
  table: MRT_TableInstance<T>;
}

export default function AnalysisDashboard<T extends AnalysisDashboardRow>(props: AnalysisDashboardProps<T>) {
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <NoSidebarLayout>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          {props.pageTitle}
        </Typography>
      </Portal>
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
    </NoSidebarLayout>
  );
}
