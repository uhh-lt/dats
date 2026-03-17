import { DocumentSearchView } from "@features/search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/search")({
  validateSearch: (search) => {
    return {
      searchQuery: typeof search?.searchQuery === "string" ? search.searchQuery : "",
    };
  },
  component: DocumentSearchView,
});
