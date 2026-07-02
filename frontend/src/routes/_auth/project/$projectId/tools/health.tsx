import { Icon } from "@components/icons";
import { HealthView, healthViewLoader } from "@features/health";
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
  loaderDeps: ({ search }) => ({
    doctype: search.doctype,
    sortingModel: search.sortingModel,
    fetchSize: search.fetchSize,
  }),
  loader: ({ context, params, deps }) =>
    healthViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      doctype: deps.doctype,
      sortingModel: deps.sortingModel,
      fetchSize: deps.fetchSize,
    }),
  pendingComponent: () => <CircularProgress />,
  component: HealthView,
});
