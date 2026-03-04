import { ContentContainerLayout } from "@components/content-layouts";
import { Stack } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ClassifierJobs } from "./_components/ClassifierJobs";
import { ClassifierTable } from "./_components/ClassifierTable";

const routeApi = getRouteApi("/_auth/project/$projectId/classifier");

export function ClassifierView() {
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
