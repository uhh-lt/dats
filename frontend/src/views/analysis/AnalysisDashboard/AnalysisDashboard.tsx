import { Card, CardContent, CardHeader } from "@mui/material";
import { MRT_TableInstance, MaterialReactTable } from "material-react-table";
import NoSidebarLayout from "../../../layouts/NoSidebarLayout.tsx";
import { AnalysisDashboardRow } from "./useAnalysisDashboardTable.tsx";

interface AnalysisDashboardProps<T extends AnalysisDashboardRow> {
  pageTitle: string;
  headerTitle: string;
  subheaderTitle?: string;
  table: MRT_TableInstance<T>;
}

export default function AnalysisDashboard<T extends AnalysisDashboardRow>(props: AnalysisDashboardProps<T>) {
  return (
    <NoSidebarLayout>
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
