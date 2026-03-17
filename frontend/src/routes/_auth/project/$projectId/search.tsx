import { DocumentSearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";

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
  component: DocumentSearchView,
});
