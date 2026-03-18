import { Icon } from "@core/navigation";
import { SentenceSimilaritySearchView, sentenceSimilaritySearchViewLoader } from "@features/search";
import { CircularProgress } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/sentencesearch")({
  staticData: {
    tab: true,
    icon: Icon.SENTENCE_SEARCH,
    getTitle: () => "Sentence Search",
  },
  validateSearch: (search) => ({
    searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
  }),
  loader: ({ context, params }) =>
    sentenceSimilaritySearchViewLoader({
      queryClient: context.queryClient,
      projectId: params.projectId,
    }),
  pendingComponent: () => <CircularProgress />,
  errorComponent: ({ error }) => <div>Failed to load sentence search: {(error as Error).message}</div>,
  component: SentenceSimilaritySearchView,
});
