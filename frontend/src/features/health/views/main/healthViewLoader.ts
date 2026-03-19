import { DocType } from "@api/models/DocType";
import { QueryClient } from "@tanstack/react-query";
import { sdocHealthTableColumnsQueryOptions, sdocHealthTableQueryOptions } from "../../_api/healthQueryOptions";

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
    queryClient.ensureQueryData(sdocHealthTableColumnsQueryOptions(doctype)),
    queryClient.prefetchInfiniteQuery(
      sdocHealthTableQueryOptions({
        projectId,
        doctype,
        sortingModel,
        fetchSize,
      }),
    ),
  ]);
}
