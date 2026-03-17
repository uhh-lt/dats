import { SentenceSimilaritySearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/sentencesearch")({
  staticData: {
    tab: true,
    icon: Icon.SENTENCE_SEARCH,
    getTitle: () => "Sentence Search",
  },
  validateSearch: (search) => ({
    searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
  }),
  component: SentenceSimilaritySearchView,
});
