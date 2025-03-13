import { Box, Grid2 } from "@mui/material";
import { useParams } from "react-router-dom";
import SpanAnnotationEditDialog from "../../../components/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import SpanAnnotationAnalysisTable from "./SpanAnnotationAnalysisTable.tsx";

function SpanAnnotationAnalysis() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Grid2 container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid2 size={{ md: 12 }} className="myFlexContainer h100">
          <SpanAnnotationAnalysisTable
            cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
          />
        </Grid2>
      </Grid2>
      <SpanAnnotationEditDialog projectId={projectId} />
    </Box>
  );
}

export default SpanAnnotationAnalysis;
