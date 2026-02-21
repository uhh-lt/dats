import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { SentenceAnnotationEditDialog } from "../../../core/sentence-annotation/dialog/SentenceAnnotationEditDialog.tsx";
import { ContentLayout } from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import { SentAnnotationAnalysisTable } from "./SentAnnotationAnalysisTable.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/sentence-annotations");

export function SentAnnotationAnalysis() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SentAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SentenceAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
