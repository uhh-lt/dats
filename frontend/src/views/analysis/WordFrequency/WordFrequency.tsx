import { Box } from "@mui/material";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import WordFrequencyTable from "./WordFrequencyTable.tsx";
import { getRouteApi } from "@tanstack/react-router";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/word-frequency");

function WordFrequency() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <WordFrequencyTable projectId={projectId} />
      </Box>
    </ContentLayout>
  );
}

export default WordFrequency;
