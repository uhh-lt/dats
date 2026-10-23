import { Icon } from "@components/icons";
import { FILTER_PARAM, searchParamFilterValidators, toSorts } from "@core/filter";
import { projectMetadataQueries } from "@core/project-metadata";
import { sdocQueries } from "@core/source-document";
import { DocumentSearchView } from "@features/search";
import { SdocColumns } from "@models/SdocColumns";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { searchParamBooleanValidator, searchParamSortingModelValidator } from "@utils/searchParamValidators";

const documentSearchSchema = z.object({
  searchQuery: z.string().default(""),
  ...searchParamFilterValidators<SdocColumns>(),
  searchExpertMode: searchParamBooleanValidator({ default: false }),
  selectedFolderId: z.coerce.number().default(-1),
  sortingModel: searchParamSortingModelValidator(),
  fetchSize: z.coerce.number().default(20),
  showFolders: searchParamBooleanValidator({ default: true }),
  showChildFolders: searchParamBooleanValidator({ default: false }),
});

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  staticData: {
    tab: true,
    icon: Icon.DOCUMENT_SEARCH,
    getTitle: () => "Document Search",
  },
  validateSearch: zodValidator(documentSearchSchema),
  loaderDeps: ({ search }) => search,
  context: ({ params, deps }) => ({
    documentSearchOptions: sdocQueries.search({
      projectId: params.projectId,
      folderId: deps.selectedFolderId === -1 ? null : deps.selectedFolderId,
      searchQuery: deps.searchQuery,
      expertMode: deps.searchExpertMode,
      requestBody: { filter: deps[FILTER_PARAM], sorts: toSorts<SdocColumns>(deps.sortingModel) },
      pageSize: deps.fetchSize,
      showFolders: deps.showFolders,
      showChildFolders: deps.showChildFolders,
    }),
    projectMetadataOptions: projectMetadataQueries.byProject(params.projectId),
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
