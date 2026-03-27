import { SdocColumns } from "@api/models/SdocColumns";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { DocumentSearchView, documentSearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Icon } from "@utils/icons/iconUtils";
import { z } from "zod";

const documentSearchSchema = z.object({
  searchQuery: z.string().default(""),
  [FILTER_PARAM]: z
    .custom<string | MyFilter<SdocColumns>>()
    .default("")
    .transform((value) => deserializeFilterFromSearchParam<SdocColumns>(value, "root")),
  [FILTER_EXPERT_MODE_PARAM]: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(false),
  selectedFolderId: z.coerce.number().default(-1),
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
    expertMode: search[FILTER_EXPERT_MODE_PARAM],
    selectedFolderId: search.selectedFolderId,
    sortingModel: search.sortingModel,
    fetchSize: search.fetchSize,
  }),
  loader: ({ context, params, deps }) =>
    documentSearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
      searchQuery: deps.searchQuery,
      searchFilter: deps.searchFilter,
      expertMode: deps.expertMode,
      selectedFolderId: deps.selectedFolderId,
      sortingModel: deps.sortingModel,
      fetchSize: deps.fetchSize,
    }),
  pendingComponent: () => <CircularProgress />,
  component: DocumentSearchView,
});
