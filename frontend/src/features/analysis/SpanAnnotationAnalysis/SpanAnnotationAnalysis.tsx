import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { SpanAnnotationEditDialog } from "../../../core/span-annotation/dialog/SpanAnnotationEditDialog.tsx";
import { ContentLayout } from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import { SpanAnnotationAnalysisTable } from "./SpanAnnotationAnalysisTable.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/span-annotations");

export function SpanAnnotationAnalysis() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SpanAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SpanAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
