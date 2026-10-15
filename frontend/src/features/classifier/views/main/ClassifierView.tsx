import { ContentContainerLayout } from "@components/content-layouts";
import { Stack } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { ClassifierJobs } from "./_components/ClassifierJobs";
import { ClassifierTable } from "./_components/ClassifierTable";

const routeApi = getRouteApi("/_auth/project/$projectId/classifier");

export function ClassifierView() {
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  const { classifiersByProjectOptions, classifierJobsByProjectOptions } = routeApi.useRouteContext();
  const classifiersQuery = useSuspenseQuery(classifiersByProjectOptions);
  const classifierJobsQuery = useSuspenseQuery(classifierJobsByProjectOptions);

  const classifiers = useMemo(() => Object.values(classifiersQuery.data), [classifiersQuery.data]);

  return (
    <>
      <ContentContainerLayout>
        <Stack height="100%" spacing={2}>
          <ClassifierTable
            projectId={projectId}
            classifiers={classifiers}
            isFetching={classifiersQuery.isFetching}
            isError={classifiersQuery.isError}
            onRefresh={() => {
              void classifiersQuery.refetch();
            }}
          />
          <ClassifierJobs
            classifierJobs={classifierJobsQuery.data}
            isFetching={classifierJobsQuery.isFetching}
            onRefresh={() => {
              void classifierJobsQuery.refetch();
            }}
          />
        </Stack>
      </ContentContainerLayout>
    </>
  );
}
