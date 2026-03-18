import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "@core/filter";
import { Icon } from "@core/navigation";
import { DocumentSearchView, documentSearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const documentSearchSchema = z.object({
  searchQuery: z.string().default(""),
  [FILTER_PARAM]: z.string().default(""),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
});

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  staticData: {
    tab: true,
    icon: Icon.DOCUMENT_SEARCH,
    getTitle: () => "Document Search",
  },
  validateSearch: zodValidator(documentSearchSchema),
  loaderDeps: ({ search }) => ({
    searchQuery: search.searchQuery,
    searchFilter: search[FILTER_PARAM],
  }),
  loader: ({ context, params, deps }) =>
    documentSearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      searchFilter: deps.searchFilter,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load document search: {(error as Error).message}</div>,
  component: DocumentSearchView,
});
