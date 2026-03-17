import { ImageSimilaritySearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

export const Route = createFileRoute("/_auth/project/$projectId/imagesearch")({
  staticData: {
    tab: true,
    icon: Icon.IMAGE_SEARCH,
    getTitle: () => "Image Search",
  },
  validateSearch: (search) => ({
    searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
  }),
  component: ImageSimilaritySearchView,
});
