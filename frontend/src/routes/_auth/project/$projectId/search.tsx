import { Icon } from "@core/navigation";
import { DocumentSearchView, documentSearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  staticData: {
    tab: true,
    icon: Icon.DOCUMENT_SEARCH,
    getTitle: () => "Document Search",
  },
  validateSearch: (search) => {
    return {
      searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
    };
  },
  loader: ({ context, params }) =>
    documentSearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load document search: {(error as Error).message}</div>,
  component: DocumentSearchView,
});
