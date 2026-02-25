import { Stack } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { ContentContainerLayout } from "../../../../components/content-layouts/ContentContainerLayout";
import { ClassifierJobs } from "./_components/ClassifierJobs";
import { ClassifierTable } from "./_components/ClassifierTable";

const routeApi = getRouteApi("/_auth/project/$projectId/classifier");

export function Classifier() {
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
