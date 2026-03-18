import { Icon } from "@core/navigation";
import { ImageSimilaritySearchView, imageSimilaritySearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  staticData: {
    tab: true,
    icon: Icon.IMAGE_SEARCH,
    getTitle: () => "Image Search",
  },
  validateSearch: (search) => ({
    searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
  }),
  loader: ({ context, params }) =>
    imageSimilaritySearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load image search: {(error as Error).message}</div>,
  component: ImageSimilaritySearchView,
});
