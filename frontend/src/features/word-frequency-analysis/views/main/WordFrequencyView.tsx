import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ContentLayout } from "../../../../components/content-layouts/ContentLayout";
import { WordFrequencyTable } from "./_components/WordFrequencyTable";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/word-frequency");

export function WordFrequencyView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <WordFrequencyTable projectId={projectId} />
      </Box>
    </ContentLayout>
  );
}
