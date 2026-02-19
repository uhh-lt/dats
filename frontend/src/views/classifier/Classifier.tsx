import { Stack } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import ClassifierJobs from "./ClassifierJobs.tsx";
import ClassifierTable from "./ClassifierTable.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/classifier");

function Classifier() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <>
      <ContentContainerLayout>
        <Stack height="100%" spacing={2}>
          <ClassifierTable projectId={projectId} />
          <ClassifierJobs projectId={projectId} />
        </Stack>
      </ContentContainerLayout>
    </>
  );
}

export default Classifier;
