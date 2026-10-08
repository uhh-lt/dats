import { DocType } from "@models/DocType";
import { QueryClient } from "@tanstack/react-query";
import { healthQueries } from "../../_api/healthQueries";

interface HealthViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  doctype: DocType;
  sortingModel: { id: string; desc: boolean }[];
  fetchSize: number;
}

export async function healthViewLoader({
  queryClient,
  projectId,
  doctype,
  sortingModel,
  fetchSize,
}: HealthViewLoaderArgs) {
  await Promise.all([
    queryClient.ensureQueryData(healthQueries.columns(doctype)),
    queryClient.prefetchInfiniteQuery(
      healthQueries.table({
        projectId,
        doctype,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
