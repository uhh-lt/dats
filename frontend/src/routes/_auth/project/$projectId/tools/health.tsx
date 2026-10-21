import { Icon } from "@components/icons";
import { toSorts } from "@core/filter";
import { healthQueries, HealthView } from "@features/health";
import { DocType } from "@models/DocType";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const healthSearchSchema = z.object({
  doctype: z.nativeEnum(DocType).default(DocType.TEXT),
  sortingModel: z
    .array(
      z.object({
        id: z.string(),
        desc: z.boolean(),
      }),
    )
    .default([]),
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
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params, deps }) => ({
    healthTableColumnsOptions: healthQueries.columns(deps.doctype),
    healthTableOptions: healthQueries.search({
      projectId: params.projectId,
      doctype: deps.doctype,
      requestBody: toSorts(deps.sortingModel),
      pageSize: deps.fetchSize,
    }),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.healthTableColumnsOptions),
      context.queryClient.ensureInfiniteQueryData(context.healthTableOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: HealthView,
});
