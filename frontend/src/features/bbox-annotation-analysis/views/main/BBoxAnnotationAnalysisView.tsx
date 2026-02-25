import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ContentLayout } from "../../../../components/content-layouts/ContentLayout";
import { BBoxAnnotationEditDialog } from "../../../../core/bbox-annotation/BBoxAnnotationEditDialog";
import { BBoxAnnotationAnalysisTable } from "./_components/BBoxAnnotationAnalysisTable";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/bbox-annotations");

export function BBoxAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <BBoxAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <BBoxAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
