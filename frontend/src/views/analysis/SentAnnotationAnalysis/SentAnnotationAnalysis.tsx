import { Box, Grid2, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import SentenceAnnotationEditDialog from "../../../components/SentenceAnnotation/SentenceAnnotationEditDialog.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import SentAnnotationAnalysisTable from "./SentAnnotationAnalysisTable.tsx";

function SentAnnotationAnalysis() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" component="div">
          Sent Annotations
        </Typography>
      </Portal>
      <Grid2 container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid2 size={{ md: 12 }} className="myFlexContainer h100">
          <SentAnnotationAnalysisTable
            cardProps={{ elevation: 2, className: "myFlexFillAllContainer myFlexContainer" }}
          />
        </Grid2>
      </Grid2>
      <SentenceAnnotationEditDialog projectId={projectId} />
    </Box>
  );
}

export default SentAnnotationAnalysis;
