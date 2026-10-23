import { Icon } from "@components/icons";
import { toSorts } from "@core/filter";
import { healthQueries, HealthView } from "@features/health";
import { DocType } from "@models/DocType";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchParamSortingModelValidator } from "@utils/searchParamValidators";

const healthSearchSchema = z.object({
  doctype: z.nativeEnum(DocType).default(DocType.TEXT),
  sortingModel: searchParamSortingModelValidator(),
  fetchSize: z.coerce.number().default(20),
});

export const Route = createFileRoute("/_auth/project/$projectId/tools/health")({
  staticData: {
    tab: true,
    icon: Icon.HEALTH,
    getTitle: () => "Health",
  },
  validateSearch: zodValidator(healthSearchSchema),
  loaderDeps: ({ search }) => search,
  context: ({ params, deps }) => ({
    healthColumnsOptions: healthQueries.columns(deps.doctype),
    healthSearchOptions: healthQueries.search({
      projectId: params.projectId,
      doctype: deps.doctype,
      requestBody: toSorts(deps.sortingModel),
      pageSize: deps.fetchSize,
    }),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.healthColumnsOptions),
      context.queryClient.ensureInfiniteQueryData(context.healthSearchOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: HealthView,
});
