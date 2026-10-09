import { Icon } from "@components/icons";
import { deserializeFilterFromSearchParam, FILTER_EXPERT_MODE_PARAM, FILTER_PARAM, MyFilter } from "@core/filter";
import { metadataQueries } from "@core/project-metadata";
import { searchQueries } from "@core/source-document";
import { DocumentSearchView } from "@features/search";
import { SdocColumns } from "@models/SdocColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
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
  searchExpertMode: z
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
  showFolders: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => value === true || value === "true")
    .default(true),
  showChildFolders: z
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
  loaderDeps: ({ search }) => search,
  // the query options are built once here; the loader and the view use the same ones
  context: ({ params, deps }) => ({
    documentSearchOptions: searchQueries.documents({
      projectId: params.projectId,
      selectedFolderId: deps.selectedFolderId,
      searchQuery: deps.searchQuery,
      filter: deps[FILTER_PARAM],
      expertMode: deps.searchExpertMode,
      sortingModel: deps.sortingModel,
      fetchSize: deps.fetchSize,
      showFolders: deps.showFolders,
      showChildFolders: deps.showChildFolders,
    }),
    projectMetadataOptions: metadataQueries.byProject(params.projectId),
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.projectMetadataOptions),
      context.queryClient.ensureInfiniteQueryData(context.documentSearchOptions),
    ]);
  },
  pendingComponent: () => <CircularProgress />,
  component: DocumentSearchView,
});
